<?php

use App\CreatorAi\Services\CreatorAiSettings;
use App\CreatorAi\Services\CreatorAiUsageService;
use App\CreatorAi\Writing\CreatorAiGenerationMetering;
use App\Models\User;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

uses(DatabaseTransactions::class);

test('provider usage checkpoint records only bounded token counts, does not settle a billed charge, and rejects mismatching replay', function () {
    config()->set('creator_ai.enabled', true);
    config()->set('creator_ai.features.writing_basic', true);
    app(CreatorAiSettings::class)->update([
        'enabled' => true,
        'provider' => 'openai',
        'api_key' => 'sk-synthetic-metering-key',
        'free_monthly_limit' => 10,
        'pro_monthly_limit' => 100,
        'provider_monthly_budget_microusd' => 3000000,
        'per_request_reservation_microusd' => 100000,
    ]);
    $creator = User::factory()->create();
    $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
    $id = (string) Str::uuid();
    $usage = app(CreatorAiUsageService::class);
    $usage->reserve($creator, (int) $workspace->id, 'writing_basic', $id);

    $metering = app(CreatorAiGenerationMetering::class);
    $metering->record($creator, $id, 'gpt-4o-mini', 200, 100, 40, 20, 0);
    $metering->record($creator, $id, 'gpt-4o-mini', 200, 100, 40, 20, 0);

    $row = DB::table('creator_ai_generation_metering')->where('request_id', $id)->first();
    expect((int) $row->input_tokens)->toBe(200)
        ->and((int) $row->cached_input_tokens)->toBe(40)
        ->and((int) $row->cache_write_input_tokens)->toBe(20)
        ->and((int) $row->output_tokens)->toBe(100)
        ->and((array) $row)->not->toHaveKey('api_key')
        ->and((array) $row)->not->toHaveKey('prompt')
        ->and($usage->summary($creator)['reserved'])->toBe(1)
        ->and((int) DB::table('creator_ai_provider_usage_months')->where('provider', 'openai')->value('spent_microusd'))->toBe(0);

    try {
        $metering->record($creator, $id, 'gpt-4o-mini', 201, 100, 40, 20, 0);
        $this->fail('Conflicting token counts were silently accepted.');
    } catch (HttpException $e) {
        expect($e->getStatusCode())->toBe(409);
    }

    $foreign = User::factory()->create();
    try {
        $metering->record($foreign, $id, 'gpt-4o-mini', 200, 100, 40, 20, 0);
        $this->fail('Foreign creator changed the checkpoint.');
    } catch (HttpException $e) {
        expect($e->getStatusCode())->toBe(404);
    }
});

test('provider metering rejects invalid cache/reasoning breakdowns before database writes', function () {
    $creator = User::factory()->create();
    $metering = app(CreatorAiGenerationMetering::class);
    $id = (string) Str::uuid();

    expect(fn () => $metering->record($creator, $id, 'gpt-4o-mini', 10, 2, 11))
        ->toThrow(InvalidArgumentException::class);
    expect(fn () => $metering->record($creator, $id, 'gpt-4o-mini', 10, 2, 0, 0, 3))
        ->toThrow(InvalidArgumentException::class);
    expect(fn () => $metering->record($creator, $id, 'gpt-4o-mini', 10, 2, 9, 2))
        ->toThrow(InvalidArgumentException::class);
    expect(fn () => $metering->record($creator, $id, 'gpt-4o-mini', -1, 2))
        ->toThrow(InvalidArgumentException::class);
    expect(DB::table('creator_ai_generation_metering')->count())->toBe(0);
});
