<?php

use App\CreatorAi\Services\CreatorAiSettings;
use App\CreatorAi\Services\CreatorAiUsageService;
use App\CreatorAi\Writing\CreatorAiGenerationMetering;
use App\CreatorAi\Writing\CreatorAiOpenAiCostWindowAudit;
use App\Models\User;
use Carbon\CarbonImmutable;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

uses(DatabaseTransactions::class);

function creatorAiAuditDay(): string
{
    return CarbonImmutable::now('UTC')->subDays(7)->toDateString();
}

function creatorAiAuditWindow(string $day, array $costRows, array $usageRows): void
{
    $start = (new DateTimeImmutable($day.' 00:00:00', new DateTimeZone('UTC')))->getTimestamp();
    $cost = [
        'object' => 'page',
        'data' => [[
            'object' => 'bucket', 'start_time' => $start, 'end_time' => $start + 86400,
            'results' => $costRows,
        ]],
        'has_more' => false,
        'next_page' => null,
    ];
    $usage = [
        'object' => 'page',
        'data' => [[
            'object' => 'bucket', 'start_time' => $start, 'end_time' => $start + 86400,
            'results' => $usageRows,
        ]],
        'has_more' => false,
        'next_page' => null,
    ];
    Http::preventStrayRequests();
    Http::fake([
        'https://api.openai.com/v1/organization/costs*' => Http::response($cost, 200),
        'https://api.openai.com/v1/organization/usage/completions*' => Http::response($usage, 200),
    ]);
}

function creatorAiAuditConfig(): void
{
    config()->set('creator_ai.openai_cost_audit', [
        'enabled' => true,
        'admin_api_key' => 'sk-synthetic-independent-admin',
        'dedicated_project_id' => 'proj_linket_audit_synthetic',
    ]);
}

function creatorAiAuditLocalRequest(string $day): void
{
    config()->set('creator_ai.enabled', true);
    config()->set('creator_ai.features.writing_basic', true);
    app(CreatorAiSettings::class)->update([
        'enabled' => true, 'provider' => 'openai', 'api_key' => 'sk-synthetic-generation-only',
        'free_monthly_limit' => 10, 'pro_monthly_limit' => 100,
        'provider_monthly_budget_microusd' => 3000000, 'per_request_reservation_microusd' => 100000,
    ]);
    $creator = User::factory()->create();
    $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
    $id = (string) Str::uuid();
    app(CreatorAiUsageService::class)->reserve($creator, (int) $workspace->id, 'writing_basic', $id);
    app(CreatorAiGenerationMetering::class)->record($creator, $id, 'gpt-4o-mini', 200, 100, 0, 0, 0);
    DB::table('creator_ai_generation_attempts')->where('request_id', $id)
        ->update(['created_at' => $day.' 10:00:00']);
}

test('read-only provider cost and usage audit compares closed day and separate dedicated project without settling budget', function () {
    creatorAiAuditConfig();
    $day = creatorAiAuditDay();
    creatorAiAuditLocalRequest($day);
    creatorAiAuditWindow($day, [
        ['object' => 'organization.costs.result', 'project_id' => 'proj_linket_audit_synthetic',
            'amount' => ['currency' => 'usd', 'value' => 0.001234]],
    ], [
        ['object' => 'organization.usage.completions.result', 'project_id' => 'proj_linket_audit_synthetic',
            'num_model_requests' => 1, 'input_tokens' => 200, 'output_tokens' => 100],
    ]);

    $result = app(CreatorAiOpenAiCostWindowAudit::class)->report($day);
    expect($result['coverage_matches'])->toBeTrue()
        ->and($result['provider_cost_microusd'])->toBe(1234)
        ->and($result['provider_request_count'])->toBe(1)
        ->and($result['status'])->toBe('aggregate_matches_pending_invoice_review')
        ->and($result['cost_document_sha256'])->toMatch('/^[a-f0-9]{64}$/')
        ->and(DB::table('creator_ai_generation_attempts')->first()->status)->toBe('reserved')
        ->and((int) DB::table('creator_ai_provider_usage_months')->first()->spent_microusd)->toBe(0);
    Http::assertSentCount(2);
    Http::assertSent(fn ($request) =>
        str_contains($request->url(), 'project_ids')
        && ! str_contains($request->url(), 'sk-synthetic')
    );
});

test('cost audit detects uncheckpointed provider usage and never releases uncertain quota', function () {
    creatorAiAuditConfig();
    $day = creatorAiAuditDay();
    creatorAiAuditLocalRequest($day);
    creatorAiAuditWindow($day, [
        ['object' => 'organization.costs.result', 'project_id' => 'proj_linket_audit_synthetic',
            'amount' => ['currency' => 'usd', 'value' => 0.002]],
    ], [
        ['object' => 'organization.usage.completions.result', 'project_id' => 'proj_linket_audit_synthetic',
            'num_model_requests' => 2, 'input_tokens' => 400, 'output_tokens' => 200],
    ]);
    $result = app(CreatorAiOpenAiCostWindowAudit::class)->report($day);
    expect($result['coverage_matches'])->toBeFalse()
        ->and($result['status'])->toBe('reconciliation_gap')
        ->and((int) DB::table('creator_ai_generation_attempts')->first()->charged_microusd)->toBe(0)
        ->and((int) DB::table('creator_ai_provider_usage_months')->first()->reserved_microusd)->toBe(100000);
});

test('cost audit rejects foreign project values, incomplete buckets and recent windows', function () {
    creatorAiAuditConfig();
    $day = creatorAiAuditDay();
    creatorAiAuditWindow($day, [
        ['object' => 'organization.costs.result', 'project_id' => 'proj_foreign_other',
            'amount' => ['currency' => 'usd', 'value' => 1]],
    ], []);
    expect(fn () => app(CreatorAiOpenAiCostWindowAudit::class)->report($day))
        ->toThrow(RuntimeException::class);
    expect(fn () => app(CreatorAiOpenAiCostWindowAudit::class)->report(CarbonImmutable::now('UTC')->toDateString()))
        ->toThrow(RuntimeException::class);
    expect(fn () => app(CreatorAiOpenAiCostWindowAudit::class)->report('2026-02-31'))
        ->toThrow(RuntimeException::class);
});
