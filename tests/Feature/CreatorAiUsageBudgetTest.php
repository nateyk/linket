<?php

use App\CreatorAi\Services\CreatorAiSettings;
use App\CreatorAi\Services\CreatorAiUsageService;
use App\CreatorAi\Services\SalesSummaryService;
use App\Models\User;
use App\Payments\Models\DirectPaymentVerification;
use App\Payments\Models\ProSubscriptionPayment;
use Common\Billing\Models\Price;
use Common\Billing\Models\Product;
use Common\Billing\Subscription;
use Common\Workspaces\Actions\CreateWorkspace;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

uses(DatabaseTransactions::class);

/** @return array{0: User, 1: int} */
function aiUsageCreator(): array
{
    $creator = User::factory()->create();
    $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);

    return [$creator, (int) $workspace->id];
}

function aiUsageConfig(
    int $freeLimit = 10,
    int $proLimit = 100,
    int $budgetMicrousd = 3000000,
    int $requestMicrousd = 100000,
): void {
    config()->set('creator_ai.enabled', true);
    config()->set('creator_ai.features.writing_basic', true);
    config()->set('creator_ai.features.writing_advanced', true);
    config()->set('creator_ai.features.sales_summary', true);

    app(CreatorAiSettings::class)->update([
        'enabled' => true,
        'provider' => 'openai',
        'api_key' => 'sk-synthetic-not-a-real-key',
        'free_monthly_limit' => $freeLimit,
        'pro_monthly_limit' => $proLimit,
        'provider_monthly_budget_microusd' => $budgetMicrousd,
        'per_request_reservation_microusd' => $requestMicrousd,
    ]);
}

function aiUsageVerifiedPro(User $creator): void
{
    settings()->save(['billing.enable' => true]);
    $plan = Product::query()->where('system_key', 'pro')->firstOrFail();
    $price = Price::query()->where('product_id', $plan->id)->firstOrFail();

    Subscription::query()->create([
        'user_id' => $creator->id,
        'product_id' => $plan->id,
        'price_id' => $price->id,
        'gateway_name' => 'verify_et',
        'gateway_status' => 'active',
        'renews_at' => now()->addMonth(),
    ]);

    $payment = ProSubscriptionPayment::query()->create([
        'uuid' => (string) Str::uuid(),
        'creator_id' => $creator->id,
        'product_id' => $plan->id,
        'price_id' => $price->id,
        'amount_cents' => 50000,
        'status' => 'paid',
        'paid_at' => now()->subDay(),
        'subscription_period_start' => now()->subDay(),
        'subscription_period_end' => now()->addMonth(),
    ]);

    DirectPaymentVerification::query()->create([
        'reference' => 'AI-USAGE-PRO-'.Str::upper(Str::random(12)),
        'payable_type' => ProSubscriptionPayment::class,
        'payable_id' => $payment->id,
        'bank_code' => 'cbe',
        'settlement_account' => '1000123456789',
        'amount_cents' => 50000,
        'currency' => 'ETB',
        'status' => 'success',
        'verified_at' => now()->subDay(),
    ]);
}

test('AI Admin provider key is encrypted at rest and never returned by public configuration', function () {
    aiUsageConfig();
    $saved = DB::table('creator_ai_settings')->where('id', 1)->value('encrypted_config');

    expect($saved)->toBeString()->not->toContain('sk-synthetic-not-a-real-key');
    $public = app(CreatorAiSettings::class)->publicConfig();
    expect($public['api_key_configured'])->toBeTrue()
        ->and($public)->not->toHaveKey('api_key')
        ->and(json_encode($public))->not->toContain('sk-synthetic-not-a-real-key');
});

test('Free creator has ten monthly generations with idempotent reservations and correct actual usage', function () {
    aiUsageConfig();
    [$creator, $workspaceId] = aiUsageCreator();
    $usage = app(CreatorAiUsageService::class);

    $firstId = (string) Str::uuid();
    $first = $usage->reserve($creator, $workspaceId, 'writing_basic', $firstId);
    expect($first['status'])->toBe('reserved');
    $replayed = $usage->reserve($creator, $workspaceId, 'writing_basic', $firstId);
    expect($replayed['status'])->toBe('reserved');

    $complete = $usage->complete($creator, $firstId, 35000);
    expect($complete['status'])->toBe('completed');
    expect($usage->complete($creator, $firstId, 35000)['status'])->toBe('completed');

    for ($i = 0; $i < 9; $i++) {
        $usage->reserve($creator, $workspaceId, 'writing_basic', (string) Str::uuid());
    }

    $summary = $usage->summary($creator);
    expect($summary['limit'])->toBe(10)
        ->and($summary['completed'])->toBe(1)
        ->and($summary['reserved'])->toBe(9)
        ->and($summary['remaining'])->toBe(0);

    try {
        $usage->reserve($creator, $workspaceId, 'writing_basic', (string) Str::uuid());
        $this->fail('Quota was exceeded.');
    } catch (HttpException $e) {
        expect($e->getStatusCode())->toBe(429);
    }
});

test('a provider failure releases a reserved request and provider budget once', function () {
    aiUsageConfig(freeLimit: 1, budgetMicrousd: 100000, requestMicrousd: 100000);
    [$creator, $workspaceId] = aiUsageCreator();
    $usage = app(CreatorAiUsageService::class);
    $id = (string) Str::uuid();

    $usage->reserve($creator, $workspaceId, 'writing_basic', $id);
    expect($usage->summary($creator)['remaining'])->toBe(0);
    expect($usage->fail($creator, $id)['status'])->toBe('failed');
    expect($usage->fail($creator, $id)['status'])->toBe('failed');
    expect($usage->summary($creator)['remaining'])->toBe(1);

    $next = $usage->reserve($creator, $workspaceId, 'writing_basic', (string) Str::uuid());
    expect($next['status'])->toBe('reserved');
});

test('provider monthly budget is a shared cap across creators and overspending is denied', function () {
    aiUsageConfig(budgetMicrousd: 100000, requestMicrousd: 100000);
    [$firstCreator, $firstWorkspace] = aiUsageCreator();
    [$secondCreator, $secondWorkspace] = aiUsageCreator();
    $usage = app(CreatorAiUsageService::class);
    $usage->reserve($firstCreator, $firstWorkspace, 'writing_basic', (string) Str::uuid());

    try {
        $usage->reserve($secondCreator, $secondWorkspace, 'writing_basic', (string) Str::uuid());
        $this->fail('Monthly provider budget was bypassed.');
    } catch (HttpException $e) {
        expect($e->getStatusCode())->toBe(429);
    }
});

test('current Verify-et-backed Pro has 100 monthly generations rather than the Free cap', function () {
    aiUsageConfig();
    [$creator, $workspaceId] = aiUsageCreator();
    aiUsageVerifiedPro($creator);
    $usage = app(CreatorAiUsageService::class);

    $usage->reserve($creator, $workspaceId, 'writing_basic', (string) Str::uuid());
    expect($usage->summary($creator)['limit'])->toBe(100);
    expect($usage->summary($creator)['plan'])->toBe('pro');
});

test('generation reservation refuses foreign workspaces and calls with disabled or unconfigured settings', function () {
    [$creator] = aiUsageCreator();
    [, $foreignWorkspace] = aiUsageCreator();
    $usage = app(CreatorAiUsageService::class);

    try {
        $usage->reserve($creator, $foreignWorkspace, 'writing_basic', (string) Str::uuid());
        $this->fail('Disabled AI could reserve budget.');
    } catch (HttpException $e) {
        expect($e->getStatusCode())->toBe(403);
    }

    aiUsageConfig();
    try {
        $usage->reserve($creator, $foreignWorkspace, 'writing_basic', (string) Str::uuid());
        $this->fail('Unauthorized workspace reserved credits.');
    } catch (HttpException $e) {
        expect($e->getStatusCode())->toBe(403);
    }
});

test('generations reject another creator settling their attempt and prohibit over-reservation charges', function () {
    aiUsageConfig();
    [$creator, $workspaceId] = aiUsageCreator();
    [$otherCreator] = aiUsageCreator();
    $usage = app(CreatorAiUsageService::class);
    $id = (string) Str::uuid();
    $usage->reserve($creator, $workspaceId, 'writing_basic', $id);

    try {
        $usage->complete($otherCreator, $id, 10000);
        $this->fail('A foreign creator settled the attempt.');
    } catch (HttpException $e) {
        expect($e->getStatusCode())->toBe(404);
    }

    $this->expectException(InvalidArgumentException::class);
    $usage->complete($creator, $id, 100001);
});

test('read-only sales summaries do not consume generation quota', function () {
    aiUsageConfig();
    [$creator, $workspaceId] = aiUsageCreator();
    $summary = app(SalesSummaryService::class);
    for ($i = 0; $i < 3; $i++) {
        $result = $summary->summary(
            $creator,
            $workspaceId,
            CarbonImmutable::parse('2026-10-01'),
            CarbonImmutable::parse('2026-10-31')
        );
        expect($result['verified_sales_count'])->toBe(0);
    }
    expect(app(CreatorAiUsageService::class)->summary($creator)['remaining'])->toBe(10);
});
