<?php

use App\CreatorAi\Services\CreatorAiSettings;
use App\CreatorAi\Services\CreatorAiUsageService;
use App\CreatorAi\Writing\CreatorAiGenerationMetering;
use App\CreatorAi\Writing\CreatorAiProviderCostReconciler;
use App\Models\User;
use Carbon\CarbonImmutable;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\Models\Workspace;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

test('two isolated PHP workers and independent MySQL connections settle one provider cost window exactly once', function () {
    if (! function_exists('pcntl_fork') || ! function_exists('pcntl_waitpid')) {
        $this->markTestSkipped('Independent PHP worker race requires pcntl on Linux.');
    }
    $connection = DB::connection();
    if ($connection->getDriverName() !== 'mysql'
        || ! app()->environment('testing')
        || ! str_contains(strtolower($connection->getDatabaseName()), 'test')) {
        $this->markTestSkipped('Requires guarded disposable MySQL test database.');
    }

    $oldSettings = DB::table('creator_ai_settings')->where('id', 1)->first();
    $creator = null;
    $workspace = null;
    $requestId = null;
    $forked = 0;
    $reaped = false;
    $day = '2033-09-05';
    $resultPath = tempnam(sys_get_temp_dir(), 'linket-ai-cost-race-');
    try {
        Carbon::setTestNow('2033-09-12 12:00:00 UTC');
        CarbonImmutable::setTestNow('2033-09-12 12:00:00 UTC');
        config()->set('creator_ai.enabled', true);
        config()->set('creator_ai.features.writing_basic', true);
        config()->set('creator_ai.openai_cost_audit', [
            'enabled' => true,
            'admin_api_key' => 'sk-synthetic-independent-test-admin',
            'dedicated_project_id' => 'proj_linket_race_synthetic',
            'generation_api_key_id' => 'key_linket_race_synthetic',
            'exclusive_project' => true,
            'settlement_enabled' => true,
        ]);
        app(CreatorAiSettings::class)->update([
            'enabled' => true, 'provider' => 'openai',
            'api_key' => 'sk-synthetic-generation-only',
            'free_monthly_limit' => 10, 'pro_monthly_limit' => 100,
            'provider_monthly_budget_microusd' => 1000000,
            'per_request_reservation_microusd' => 100000,
        ]);
        $creator = User::factory()->create();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        $requestId = (string) Str::uuid();
        app(CreatorAiUsageService::class)->reserve($creator, (int) $workspace->id, 'writing_basic', $requestId);
        app(CreatorAiGenerationMetering::class)->record($creator, $requestId, 'gpt-4o-mini', 200, 100);
        DB::table('creator_ai_generation_attempts')->where('request_id', $requestId)
            ->update(['created_at' => $day.' 10:00:00']);

        $start = (new DateTimeImmutable($day.' 00:00:00', new DateTimeZone('UTC')))->getTimestamp();
        Http::preventStrayRequests();
        Http::fake(function ($request) use ($start) {
            $url = $request->url();
            $cost = str_contains($url, '/organization/costs');
            $grouped = str_contains($url, 'api_key_id');
            $row = $cost
                ? ['object' => 'organization.costs.result',
                    'project_id' => 'proj_linket_race_synthetic',
                    'amount' => ['currency' => 'usd', 'value' => 0.025]]
                : ['object' => 'organization.usage.completions.result',
                    'project_id' => 'proj_linket_race_synthetic',
                    'num_model_requests' => 1, 'input_tokens' => 200, 'output_tokens' => 100];
            if ($grouped) {
                $row['api_key_id'] = 'key_linket_race_synthetic';
            }

            return Http::response([
                'object' => 'page', 'data' => [[
                    'object' => 'bucket', 'start_time' => $start,
                    'end_time' => $start + 86400, 'results' => [$row],
                ]], 'has_more' => false, 'next_page' => null,
            ], 200);
        });

        $reconciler = app(CreatorAiProviderCostReconciler::class);
        expect($reconciler->reconcile($day)['status'])->toBe('observation_recorded');
        Carbon::setTestNow('2033-09-13 13:00:00 UTC');
        CarbonImmutable::setTestNow('2033-09-13 13:00:00 UTC');
        $parentConnectionId = (int) DB::selectOne('SELECT CONNECTION_ID() AS id')->id;

        $forked = pcntl_fork();
        if ($forked === -1) {
            throw new RuntimeException('Could not create isolated MySQL reconciliation worker.');
        }
        if ($forked === 0) {
            // Close the inherited PDO socket before using an independently
            // authenticated MySQL connection in this child PHP process.
            DB::disconnect('mysql');
            DB::purge('mysql');
            try {
                $childConnectionId = (int) DB::selectOne('SELECT CONNECTION_ID() AS id')->id;
                $result = app(CreatorAiProviderCostReconciler::class)->reconcile($day, true);
                file_put_contents($resultPath, json_encode([
                    'status' => $result['status'], 'connection' => $childConnectionId,
                ], JSON_THROW_ON_ERROR));
                exit(0);
            } catch (Throwable $error) {
                file_put_contents($resultPath, json_encode(['error' => $error->getMessage()]));
                exit(3);
            }
        }

        $parent = $reconciler->reconcile($day, true);
        pcntl_waitpid($forked, $status);
        $reaped = true;
        $child = json_decode((string) file_get_contents($resultPath), true, 512, JSON_THROW_ON_ERROR);

        expect(pcntl_wexitstatus($status))->toBe(0)
            ->and($child['status'] ?? null)->toBe('settled')
            ->and($parent['status'])->toBe('settled')
            ->and($child['connection'])->not->toBe($parentConnectionId)
            ->and(DB::table('creator_ai_provider_cost_windows')->where('day', $day)->count())->toBe(1)
            ->and((int) DB::table('creator_ai_provider_usage_months')
                ->where('provider', 'openai')->where('month', '2033-09-01')->value('spent_microusd'))->toBe(25000)
            ->and((int) DB::table('creator_ai_provider_usage_months')
                ->where('provider', 'openai')->where('month', '2033-09-01')->value('reserved_microusd'))->toBe(0)
            ->and((int) DB::table('creator_ai_usage_months')
                ->where('creator_id', $creator->id)->where('month', '2033-09-01')
                ->value('completed_requests'))->toBe(1)
            ->and(DB::table('creator_ai_generation_attempts')->where('request_id', $requestId)
                ->value('status'))->toBe('aggregate_reconciled');
    } finally {
        if ($forked > 0 && ! $reaped) {
            pcntl_waitpid($forked, $ignored);
        }
        Carbon::setTestNow();
        CarbonImmutable::setTestNow();
        // No transaction wrapper: child must see committed fixtures.
        // Clean up ONLY IDs created by this synthetic test.
        if ($requestId) {
            DB::table('creator_ai_generation_attempts')->where('request_id', $requestId)->delete();
        }
        DB::table('creator_ai_provider_cost_windows')->where('provider', 'openai')->where('day', $day)->delete();
        if ($creator) {
            DB::table('creator_ai_usage_months')->where('creator_id', $creator->id)->delete();
        }
        DB::table('creator_ai_provider_usage_months')
            ->where('provider', 'openai')->where('month', '2033-09-01')->delete();
        if ($workspace) {
            DB::table('workspace_user')->where('workspace_id', $workspace->id)->delete();
            Workspace::query()->whereKey($workspace->id)->delete();
        }
        if ($creator) {
            $creator->forceDelete();
        }
        if ($oldSettings) {
            DB::table('creator_ai_settings')->where('id', 1)->update([
                'encrypted_config' => $oldSettings->encrypted_config,
                'updated_at' => $oldSettings->updated_at,
            ]);
        }
        if (is_string($resultPath) && file_exists($resultPath)) {
            unlink($resultPath);
        }
    }
});
