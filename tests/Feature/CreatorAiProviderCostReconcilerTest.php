<?php

use App\CreatorAi\Services\CreatorAiSettings;
use App\CreatorAi\Services\CreatorAiUsageService;
use App\CreatorAi\Writing\CreatorAiGenerationMetering;
use App\CreatorAi\Writing\CreatorAiProviderCostReconciler;
use App\Models\User;
use Carbon\CarbonImmutable;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\HttpException;

uses(DatabaseTransactions::class);

const AI_COST_DAY = '2026-11-05';
const AI_COST_PROJECT = 'proj_linket_cost_test';
const AI_COST_KEY = 'key_linket_generation_test';

function aiCostFakeProvider(
    int $cost = 25000,
    int $requests = 1,
    int $input = 200,
    int $output = 100,
    ?string $foreignKey = null,
    ?int $groupedCost = null,
): void {
    $start = (new DateTimeImmutable(AI_COST_DAY.' 00:00:00', new DateTimeZone('UTC')))->getTimestamp();
    // Http::fake() registrations accumulate for the lifetime of the Facade.
    // Replace the test-only client between independent provider observations;
    // otherwise the first fake masks a later provider billing correction.
    Http::swap(new \Illuminate\Http\Client\Factory());
    Http::preventStrayRequests();
    Http::fake(function ($request) use ($cost, $requests, $input, $output, $foreignKey, $groupedCost, $start) {
        $url = $request->url();
        $grouped = str_contains($url, 'api_key_id');
        $isCost = str_contains($url, '/organization/costs');
        $item = $isCost
            ? ['object' => 'organization.costs.result', 'project_id' => AI_COST_PROJECT,
                'amount' => ['currency' => 'usd', 'value' => ($grouped ? ($groupedCost ?? $cost) : $cost) / 1000000]]
            : ['object' => 'organization.usage.completions.result', 'project_id' => AI_COST_PROJECT,
                'num_model_requests' => $requests, 'input_tokens' => $input, 'output_tokens' => $output];
        if ($grouped) {
            $item['api_key_id'] = $foreignKey ?? AI_COST_KEY;
        }

        return Http::response([
            'object' => 'page',
            'data' => [['object' => 'bucket', 'start_time' => $start,
                'end_time' => $start + 86400, 'results' => [$item]]],
            'has_more' => false, 'next_page' => null,
        ], 200);
    });
}

function aiCostSetup(): void
{
    Carbon::setTestNow('2026-11-12 12:00:00 UTC');
    CarbonImmutable::setTestNow('2026-11-12 12:00:00 UTC');
    config()->set('creator_ai.enabled', true);
    config()->set('creator_ai.features.writing_basic', true);
    app(CreatorAiSettings::class)->update([
        'enabled' => true, 'provider' => 'openai',
        'api_key' => 'sk-synthetic-generation-only',
        'free_monthly_limit' => 10, 'pro_monthly_limit' => 100,
        'provider_monthly_budget_microusd' => 1000000,
        'per_request_reservation_microusd' => 100000,
    ]);
    config()->set('creator_ai.openai_cost_audit', [
        'enabled' => true, 'admin_api_key' => 'sk-synthetic-independent-admin',
        'dedicated_project_id' => AI_COST_PROJECT,
        'generation_api_key_id' => AI_COST_KEY,
        'exclusive_project' => true, 'settlement_enabled' => true,
    ]);
}

/** @return array{User,string} */
function aiCostReserve(string $day = AI_COST_DAY): array
{
    $creator = User::factory()->create();
    $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
    $id = (string) Str::uuid();
    app(CreatorAiUsageService::class)->reserve($creator, (int) $workspace->id, 'writing_basic', $id);
    app(CreatorAiGenerationMetering::class)->record($creator, $id, 'gpt-4o-mini', 200, 100);
    DB::table('creator_ai_generation_attempts')->where('request_id', $id)
        ->update(['created_at' => $day.' 10:00:00']);

    return [$creator, $id];
}

function aiCostTomorrow(): void
{
    Carbon::setTestNow('2026-11-13 13:00:00 UTC');
    CarbonImmutable::setTestNow('2026-11-13 13:00:00 UTC');
}

afterEach(function () {
    Carbon::setTestNow();
    CarbonImmutable::setTestNow();
});

test('closed day requires two unchanged provider observations before the exact aggregate budget is charged', function () {
    aiCostSetup();
    [$creator, $id] = aiCostReserve();
    aiCostFakeProvider();
    $service = app(CreatorAiProviderCostReconciler::class);
    expect($service->reconcile(AI_COST_DAY)['status'])->toBe('observation_recorded');
    expect($service->reconcile(AI_COST_DAY, true)['status'])->toBe('awaiting_second_observation');
    expect(app(CreatorAiUsageService::class)->summary($creator)['reserved'])->toBe(1);

    aiCostTomorrow();
    expect($service->reconcile(AI_COST_DAY)['status'])->toBe('ready_for_operator_settlement');
    expect($service->reconcile(AI_COST_DAY, true)['status'])->toBe('settled');
    expect($service->reconcile(AI_COST_DAY, true)['status'])->toBe('settled');

    $attempt = DB::table('creator_ai_generation_attempts')->where('request_id', $id)->first();
    $provider = DB::table('creator_ai_provider_usage_months')->first();
    $window = DB::table('creator_ai_provider_cost_windows')->first();
    expect($attempt->status)->toBe('aggregate_reconciled')
        ->and((int) $attempt->cost_window_id)->toBe((int) $window->id)
        ->and($attempt->charged_microusd)->toBeNull()
        ->and((int) $provider->reserved_microusd)->toBe(0)
        ->and((int) $provider->spent_microusd)->toBe(25000)
        ->and($window->status)->toBe('settled')
        ->and(app(CreatorAiUsageService::class)->summary($creator)['completed'])->toBe(1);

    try {
        app(CreatorAiUsageService::class)->complete($creator, $id, 25000);
        $this->fail('The aggregate-reconciled request was billed a second time.');
    } catch (HttpException $error) {
        expect($error->getStatusCode())->toBe(409);
    }
    Http::assertSentCount(20);
});

test('multiple creators share one provider aggregate without invented per-request allocations', function () {
    aiCostSetup();
    [$first, $idOne] = aiCostReserve();
    [$second, $idTwo] = aiCostReserve();
    aiCostFakeProvider(cost: 65000, requests: 2, input: 400, output: 200);
    $service = app(CreatorAiProviderCostReconciler::class);
    expect($service->reconcile(AI_COST_DAY)['status'])->toBe('observation_recorded');
    aiCostTomorrow();
    expect($service->reconcile(AI_COST_DAY, true)['status'])->toBe('settled');
    $provider = DB::table('creator_ai_provider_usage_months')->first();
    expect((int) $provider->spent_microusd)->toBe(65000)
        ->and((int) $provider->reserved_microusd)->toBe(0)
        ->and(app(CreatorAiUsageService::class)->summary($first)['completed'])->toBe(1)
        ->and(app(CreatorAiUsageService::class)->summary($second)['completed'])->toBe(1)
        ->and(DB::table('creator_ai_generation_attempts')
            ->whereIn('request_id', [$idOne, $idTwo])
            ->where('status', 'aggregate_reconciled')->count())->toBe(2);
});

test('a separate calendar day hold is never consumed by the audited day settlement', function () {
    aiCostSetup();
    [$first] = aiCostReserve();
    [$second, $otherId] = aiCostReserve('2026-11-06');
    aiCostFakeProvider();
    $service = app(CreatorAiProviderCostReconciler::class);
    $service->reconcile(AI_COST_DAY);
    aiCostTomorrow();
    $service->reconcile(AI_COST_DAY, true);
    $provider = DB::table('creator_ai_provider_usage_months')->first();
    expect((int) $provider->spent_microusd)->toBe(25000)
        ->and((int) $provider->reserved_microusd)->toBe(100000)
        ->and(app(CreatorAiUsageService::class)->summary($first)['completed'])->toBe(1)
        ->and(app(CreatorAiUsageService::class)->summary($second)['reserved'])->toBe(1)
        ->and(DB::table('creator_ai_generation_attempts')
            ->where('request_id', $otherId)->value('status'))->toBe('reserved');
});

test('provider cost revision resets the observation hold without changing quota or money', function () {
    aiCostSetup();
    [$creator] = aiCostReserve();
    aiCostFakeProvider(cost: 25000);
    $service = app(CreatorAiProviderCostReconciler::class);
    $service->reconcile(AI_COST_DAY);
    aiCostTomorrow();
    aiCostFakeProvider(cost: 30000);
    expect($service->reconcile(AI_COST_DAY, true)['status'])->toBe('provider_snapshot_changed');
    expect($service->reconcile(AI_COST_DAY, true)['status'])->toBe('awaiting_second_observation');
    expect(app(CreatorAiUsageService::class)->summary($creator)['reserved'])->toBe(1)
        ->and((int) DB::table('creator_ai_provider_usage_months')->first()->spent_microusd)->toBe(0);
});

test('unmatched counts, foreign billed key, grouped cost disagreement and provider overage fail closed', function ($case) {
    aiCostSetup();
    [$creator] = aiCostReserve();
    match ($case) {
        'counts' => aiCostFakeProvider(requests: 2, input: 400, output: 200),
        'foreign_key' => aiCostFakeProvider(foreignKey: 'key_unrelated_test'),
        'mismatch' => aiCostFakeProvider(groupedCost: 26000),
        'overage' => aiCostFakeProvider(cost: 250000),
    };
    expect(fn () => app(CreatorAiProviderCostReconciler::class)->reconcile(AI_COST_DAY))
        ->toThrow(RuntimeException::class);
    $provider = DB::table('creator_ai_provider_usage_months')->first();
    expect((int) $provider->reserved_microusd)->toBe(100000)
        ->and((int) $provider->spent_microusd)->toBe(0)
        ->and(DB::table('creator_ai_provider_cost_windows')->count())->toBe(0)
        ->and(app(CreatorAiUsageService::class)->summary($creator)['reserved'])->toBe(1);
})->with(['counts', 'foreign_key', 'mismatch', 'overage']);

test('read-only reporting alone does not authorize provider cost settlement', function () {
    aiCostSetup();
    aiCostReserve();
    aiCostFakeProvider();
    config()->set('creator_ai.openai_cost_audit.settlement_enabled', false);
    expect(fn () => app(CreatorAiProviderCostReconciler::class)->reconcile(AI_COST_DAY))
        ->toThrow(RuntimeException::class);
    config()->set('creator_ai.openai_cost_audit.settlement_enabled', true);
    config()->set('creator_ai.openai_cost_audit.exclusive_project', false);
    expect(fn () => app(CreatorAiProviderCostReconciler::class)->reconcile(AI_COST_DAY))
        ->toThrow(RuntimeException::class);
    Http::assertNothingSent();
});

test('a settled window detects later independent provider cost drift and cannot double-spend', function () {
    aiCostSetup();
    [$creator] = aiCostReserve();
    aiCostFakeProvider();
    $service = app(CreatorAiProviderCostReconciler::class);
    $service->reconcile(AI_COST_DAY);
    aiCostTomorrow();
    $service->reconcile(AI_COST_DAY, true);
    aiCostFakeProvider(cost: 27000);
    expect(fn () => $service->reconcile(AI_COST_DAY, true))->toThrow(RuntimeException::class);
    expect((int) DB::table('creator_ai_provider_usage_months')->first()->spent_microusd)->toBe(25000)
        ->and(app(CreatorAiUsageService::class)->summary($creator)['completed'])->toBe(1);
});

test('operator command refuses a first-pass settlement and retains the budget hold', function () {
    aiCostSetup();
    [$creator] = aiCostReserve();
    aiCostFakeProvider();
    $this->artisan('creator-ai:reconcile-cost-window', ['day' => AI_COST_DAY])->assertExitCode(0);
    $this->artisan('creator-ai:reconcile-cost-window', [
        'day' => AI_COST_DAY, '--settle' => true,
    ])->assertExitCode(1);
    expect(app(CreatorAiUsageService::class)->summary($creator)['reserved'])->toBe(1);
});
