<?php

use App\CreatorAi\Storefront\StorefrontAppearanceProposalService;
use App\Models\User;
use App\Payments\Models\DirectPaymentVerification;
use App\Payments\Models\ProSubscriptionPayment;
use App\Stores\Models\Store;
use Common\Billing\Models\Price;
use Common\Billing\Models\Product;
use Common\Billing\Subscription;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Never wrap these fixtures in DatabaseTransactions. Independent PHP/MySQL
 * workers must observe committed rows and contend on real InnoDB locks.
 */
beforeEach(function () {
    expect(config('database.connections.'.config('database.default').'.database'))->toContain('test');
    expect(DB::transactionLevel())->toBe(0);
    if (DB::getDriverName() !== 'mysql' || !function_exists('proc_open')) {
        $this->markTestSkipped('True storefront races need MySQL and proc_open.');
    }
    $this->appearanceRaceCreatorId = null;
    $this->appearanceRaceStoreId = null;
});

afterEach(function () {
    $id = $this->appearanceRaceCreatorId ?? null;
    if (!$id) return;

    $storeId = $this->appearanceRaceStoreId ?? null;
    if ($storeId) {
        $store = Store::query()->withTrashed()->find($storeId);
        if ($store) {
            $store->appearance()->delete();
            DB::table($store->getTable())->where('id', $storeId)->delete();
        }
    }

    $paymentIds = ProSubscriptionPayment::query()->where('creator_id', $id)->pluck('id');
    DirectPaymentVerification::query()
        ->where('payable_type', ProSubscriptionPayment::class)
        ->whereIn('payable_id', $paymentIds)->delete();
    ProSubscriptionPayment::query()->where('creator_id', $id)->delete();
    Subscription::query()->where('user_id', $id)->delete();
    DB::table('workspace_user')->where('user_id', $id)->delete();
    DB::table('workspaces')->where('owner_id', $id)->delete();
    User::query()->whereKey($id)->delete();
});

/**
 * Worker may print the test bootstrap's harmless guard notice before its
 * own JSON ready/result markers; accept only typed protocol messages.
 *
 * @return array<string,mixed>
 */
function nextAppearanceRaceMessage($pipe, string $field): array
{
    for ($i = 0; $i < 8; $i++) {
        $line = fgets($pipe);
        if (!is_string($line)) break;
        $message = json_decode(trim($line), true);
        if (is_array($message) && array_key_exists($field, $message)) {
            return $message;
        }
    }
    throw new RuntimeException('Storefront worker did not emit a valid '.$field.' record.');
}

test('two MySQL creators saves of the same reviewed appearance revision cannot both succeed', function () {
    config()->set('creator_ai.enabled', true);
    config()->set('creator_ai.features.storefront_drafts', true);
    config()->set('creator_ai.storefront_preview.enabled', true);

    $creator = User::factory()->create(['email_verified_at' => now()]);
    $this->appearanceRaceCreatorId = (int) $creator->id;
    $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
    $store = Store::factory()->create([
        'user_id' => $creator->id,
        'workspace_id' => $workspace->id,
        'builder_mode' => Store::BUILDER_MODE_CREATOR_PROFILE,
    ]);
    $this->appearanceRaceStoreId = (int) $store->id;
    $baseline = [
        'layout' => 'default',
        'btnConfig' => ['variant' => 'outline', 'radius' => 'rounded-sm', 'shadow' => 'none'],
    ];
    $store->appearance()->create(['config' => $baseline]);

    $plan = Product::query()->where('system_key', 'pro')->firstOrFail();
    $price = Price::query()->where('product_id', $plan->id)
        ->where('currency', 'ETB')->firstOrFail();
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
        'reference' => 'AI-STORE-RACE-'.Str::upper(Str::random(12)),
        'payable_type' => ProSubscriptionPayment::class,
        'payable_id' => $payment->id,
        'bank_code' => 'cbe',
        'settlement_account' => '1000123456789',
        'amount_cents' => 50000,
        'currency' => 'ETB',
        'status' => 'success',
        'verified_at' => now()->subDay(),
    ]);

    $fingerprint = app(StorefrontAppearanceProposalService::class)
        ->preview($creator, $store, 'clear')['source_fingerprint'];
    expect($fingerprint)->toMatch('/^[a-f0-9]{64}$/');

    $options = [
        ['layout' => 'default', 'btnConfig' => [
            'variant' => 'solid', 'radius' => 'rounded-lg', 'shadow' => 'none',
        ]],
        ['layout' => 'default', 'btnConfig' => [
            'variant' => 'outline', 'radius' => 'rounded-lg', 'shadow' => 'none',
        ]],
    ];
    $workers = [];
    $config = ['creator_ai' => config('creator_ai')];

    DB::beginTransaction();
    try {
        $locked = DB::table($store->getTable())
            ->where('id', $store->id)->lockForUpdate()->first();
        expect($locked)->not->toBeNull();

        foreach ($options as $appearance) {
            $process = proc_open(
                [PHP_BINARY, base_path('tests/Support/creator-storefront-appearance-worker.php')],
                [['pipe', 'r'], ['pipe', 'w'], ['pipe', 'w']],
                $pipes,
                base_path(),
            );
            expect(is_resource($process))->toBeTrue();
            $workers[] = [$process, $pipes];
            stream_set_timeout($pipes[1], 15);
            fwrite($pipes[0], json_encode([
                'creator_id' => (int) $creator->id,
                'store_id' => (int) $store->id,
                'source_fingerprint' => $fingerprint,
                'appearance' => $appearance,
                'config' => $config,
            ], JSON_THROW_ON_ERROR)."\n");
            fflush($pipes[0]);
        }

        $connections = [];
        foreach ($workers as [, $pipes]) {
            $ready = nextAppearanceRaceMessage($pipes[1], 'ready');
            $connections[] = (int) $ready['ready'];
        }
        expect(count(array_unique($connections)))->toBe(2)
            ->and($connections)->not->toContain(
                (int) DB::selectOne('SELECT CONNECTION_ID() AS id')->id,
            );

        foreach ($workers as [, $pipes]) {
            fwrite($pipes[0], "go\n");
            fflush($pipes[0]);
        }
        foreach ($workers as [, $pipes]) {
            // Both must reach FOR UPDATE while this connection still holds
            // the same store row; then the parent releases it together.
            expect(trim((string) fgets($pipes[1])))->toBe('attempting');
            fclose($pipes[0]);
        }
        DB::commit();

        $statuses = [];
        foreach ($workers as [$process, $pipes]) {
            $result = nextAppearanceRaceMessage($pipes[1], 'status');
            $errors = stream_get_contents($pipes[2]);
            fclose($pipes[1]);
            fclose($pipes[2]);
            expect(proc_close($process))->toBe(0);
            expect($errors)->toBe('');
            $statuses[] = (int) $result['status'];
        }
        $workers = [];
        expect($statuses)->toEqualCanonicalizing([200, 409]);
        expect($store->fresh()->appearance->config)->toBeIn($options);
    } finally {
        if (DB::transactionLevel() > 0) DB::rollBack();
        foreach ($workers as [$process, $pipes]) {
            if (is_resource($process)) proc_terminate($process);
            foreach ($pipes as $pipe) {
                if (is_resource($pipe)) fclose($pipe);
            }
            if (is_resource($process)) proc_close($process);
        }
    }
});
