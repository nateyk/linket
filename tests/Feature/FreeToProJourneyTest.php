<?php

use App\Models\User;
use App\Payments\Commands\ProcessDirectSubscriptionRenewals;
use App\Payments\Models\DirectPaymentVerification;
use App\Payments\VerifyEt\VerifyEtMoney;
use App\Storefront\Models\CommissionAccrual;
use App\Storefront\Models\CreatorPaymentMethod;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\DirectPaymentMethod;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Services\CreatorVerificationAllowance;
use App\Stores\Models\Store;
use Common\Billing\Models\Price;
use Common\Billing\Models\Product;
use Common\Billing\Subscription;
use Common\Files\FileEntry;
use Common\Permissions\Models\Permission;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

test('ten free verified sales block the eleventh until a verified Pro payment, and expiry restores that same limit', function () {
    expect(strtolower((string) DB::connection()->getDatabaseName()))->toContain('test');

    Queue::fake();
    $this->withoutMiddleware(\Illuminate\Routing\Middleware\ThrottleRequests::class);
    config()->set('services.verify_et.enabled', true);
    config()->set('services.verify_et.mock', false);
    config()->set('services.verify_et.api_key', 'synthetic-free-to-pro');
    config()->set('services.verify_et.corporate_account', '1000123456789');
    config()->set('services.verify_et.corporate_bank_code', 'cbe');
    settings()->save(['billing.enable' => true]);
    Http::preventStrayRequests();

    $free = Product::query()->where('system_key', 'free')->first()
        ?? Product::query()->where('free', true)->orderByDesc('is_default')->firstOrFail();
    $free->update([
        'storefront_benefits' => [
            ...($free->storefront_benefits ?? []),
            'free_verified_sales' => 10,
        ],
    ]);
    $pro = Product::query()->where('system_key', 'pro')->where('active', true)->firstOrFail();
    $proPrice = Price::query()->where('product_id', $pro->id)->where('currency', 'ETB')
        ->where('interval', 'month')->where('interval_count', 1)->orderByDesc('default')->firstOrFail();
    $proCents = app(VerifyEtMoney::class)->cents((string) $proPrice->getRawOriginal('amount'));
    expect($proCents)->toBeGreaterThan(0);

    DirectPaymentMethod::query()->where('code', 'telebirr')->update([
        'creator_setup_enabled' => true,
        'checkout_enabled' => true,
        'automated_verification_supported' => true,
        'recipient_matching_supported' => true,
        'operationally_suspended' => false,
    ]);

    $suffix = substr(md5((string) microtime(true)), 0, 8);
    $password = 'JourneyPassword123!';
    $creator = User::factory()->create([
        'name' => 'Allowance Creator',
        'email' => "allowance-creator-{$suffix}@example.test",
        'password' => Hash::make($password),
        'email_verified_at' => now(),
    ]);
    $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
    $store = Store::factory()->create([
        'name' => 'Allowance store',
        'user_id' => $creator->id,
        'workspace_id' => $workspace->id,
    ]);
    $product = DigitalProduct::query()->create([
        'workspace_id' => $workspace->id,
        'user_id' => $creator->id,
        'title' => 'Allowance guide',
        'price_cents' => 247000,
        'currency' => 'ETB',
        'status' => 'approved',
        'approved_at' => now(),
        'type' => 'digital',
    ]);
    $file = FileEntry::query()->create([
        'name' => 'allowance-guide.pdf',
        'file_name' => 'allowance-'.Str::random(8).'.pdf',
        'mime' => 'application/pdf',
        'extension' => 'pdf',
        'type' => 'file',
        'file_size' => 32,
        'workspace_id' => $workspace->id,
        'owner_id' => $creator->id,
    ]);
    $bytes = "%PDF-1.4\nallowance-guide\n";
    $file->getDisk()->put($file->getStoragePath(), $bytes);
    $product->files()->attach($file->id);
    $product->biolinks()->attach($store->id);
    $method = CreatorPaymentMethod::query()->create([
        'workspace_id' => $workspace->id,
        'user_id' => $creator->id,
        'provider' => 'telebirr',
        'account_number' => '0911002480',
        'account_fingerprint' => hash('sha256', 'allowance-telebirr-'.$creator->id),
        'account_name_raw' => 'Allowance Creator',
        'account_name_normalized' => 'allowance creator',
        'status' => 'approved',
        'provider_registration_status' => 'registered',
        'is_active' => true,
        'is_suspended' => false,
    ]);

    $admin = User::factory()->create([
        'email' => "allowance-admin-{$suffix}@example.test",
        'password' => Hash::make($password),
        'email_verified_at' => now(),
    ]);
    $admin->permissions()->attach(Permission::query()->firstOrCreate(['name' => 'admin']));

    Http::fake(function (\Illuminate\Http\Client\Request $request) {
        $payload = $request->data();
        $reference = (string) ($payload['transactionNumber'] ?? $payload['reference'] ?? $payload['referenceNumber'] ?? '');
        $verification = DirectPaymentVerification::query()->where('reference', $reference)->latest('id')->first();
        $amount = $verification ? number_format($verification->amount_cents / 100, 2, '.', '') : '0.00';
        if (str_starts_with($reference, 'WRONGAMT')) {
            $amount = '1.00';
        }
        $settlement = (string) ($payload['settlementAccount'] ?? $verification?->settlement_account ?? '');
        $bank = (string) ($payload['bank'] ?? $verification?->bank_code ?? 'telebirr');

        return Http::response([
            'requestId' => 'req-'.$reference,
            'verification' => ['processingStatus' => 'completed', 'status' => 'success', 'verified' => true],
            'data' => [[
                'bank' => $bank,
                'status' => 'success',
                'verified' => true,
                'amount' => $amount,
                'currency' => 'ETB',
                'transactionNumber' => $reference,
                'reference' => $reference,
                'referenceNumber' => $reference,
                'receiptNumber' => $reference,
                'settlementAccountMatch' => [
                    'matched' => true,
                    'ambiguous' => false,
                    'matchConfidence' => 'high',
                    'candidateCount' => 1,
                    'matchedSettlementAccount' => $settlement,
                ],
            ]],
        ], 200);
    });
    $transport = Mockery::mock(\App\Payments\VerifyEt\VerifyEtHttp::class);
    $transport->shouldReceive('factory')->andReturn(Http::getFacadeRoot());
    app()->instance(\App\Payments\VerifyEt\VerifyEtHttp::class, $transport);

    $this->withHeader('Referer', config('app.url'));
    $base = "/api/v1/public/biolinks/{$store->id}/digital-products/{$product->id}";
    $window = [
        'start_date' => now()->subDay()->toIso8601String(),
        'end_date' => now()->addDay()->toIso8601String(),
        'timezone' => 'UTC',
    ];
    $insights = function () use ($admin, $window) {
        $this->app['auth']->forgetGuards();
        $this->flushSession();
        ActiveWorkspace::clearCache();

        return $this->actingAs($admin)->getJson('/api/v1/admin/analytics/commerce?'.http_build_query($window))->assertOk()->json('data');
    };
    $before = $insights();

    $sell = function (int $number) use ($base, $method, $creator) {
        $this->app['auth']->forgetGuards();
        $this->flushSession();
        $this->withHeader('Referer', config('app.url'));
        $started = $this->postJson("{$base}/checkout", [
            'buyer_name' => 'Nathnael',
            'buyer_email' => "nathnael-sale-{$number}@example.test",
            'creator_payment_method_id' => $method->id,
        ])->assertOk()->json();
        $this->withHeader('X-Order-Access-Token', $started['access_token'])
            ->postJson($started['reference_endpoint'], ['reference' => 'FREE'.str_pad((string) $number, 6, '0', STR_PAD_LEFT)])
            ->assertOk()
            ->assertJsonPath('status', 'paid');
        $order = StorefrontOrder::query()->where('uuid', $started['order_id'])->firstOrFail();
        expect($order->commission_bps)->toBe(0)
            ->and($order->monetization_policy)->toBe(CreatorVerificationAllowance::FREE_POLICY)
            ->and($order->entitlements()->count())->toBe(1)
            ->and(CommissionAccrual::query()->where('storefront_order_id', $order->id)->count())->toBe(0)
            ->and(DB::table('creator_verification_allowances')->where('creator_id', $creator->id)->where('status', 'consumed')->count())->toBe($number);
    };

    foreach (range(1, 10) as $sale) {
        $sell($sale);
    }

    $blocked = StorefrontOrder::query()->where('creator_id', $creator->id)->count();
    $reservationsBeforeRead = DB::table('creator_verification_allowances')->where('creator_id', $creator->id)->count();
    $this->getJson($base)->assertOk()->assertJsonPath('data.can_buy', false)
        ->assertJsonPath('data.checkout_blocker', 'verification_quota_exhausted');
    expect(StorefrontOrder::query()->where('creator_id', $creator->id)->count())->toBe($blocked)
        ->and(DB::table('creator_verification_allowances')->where('creator_id', $creator->id)->count())->toBe($reservationsBeforeRead);
    $this->postJson("{$base}/checkout", [
        'buyer_name' => 'Nathnael',
        'buyer_email' => 'nathnael-eleventh@example.test',
        'creator_payment_method_id' => $method->id,
    ])->assertStatus(422)->assertJsonPath(
        'errors.payment.0',
        'All free verified-sale allowances are used or reserved. Upgrade to Pro to continue.',
    );
    expect(StorefrontOrder::query()->where('creator_id', $creator->id)->count())->toBe($blocked);

    $this->flushSession();
    $this->withSession(['_token' => 'free-to-pro']);
    $this->withHeader('Referer', config('app.url'));
    $this->withHeader('X-CSRF-TOKEN', 'free-to-pro');
    $this->postJson('/auth/login', [
        'email' => $creator->email,
        'password' => $password,
    ])->assertOk();
    $this->app['auth']->forgetGuards();
    ActiveWorkspace::clearCache();

    $orders = $this->getJson('/api/v1/storefront/direct-orders?from='.now()->toDateString().'&to='.now()->toDateString());
    $orders->assertOk()
        ->assertJsonPath('totals.sales_count', 10)
        ->assertJsonPath('totals.sales_cents', 2470000)
        ->assertJsonPath('summary.verified_sales_count', 10)
        ->assertJsonPath('summary.verified_revenue_cents', 2470000)
        ->assertJsonPath('verification_allowance.consumed', 10)
        ->assertJsonPath('verification_allowance.remaining', 0)
        ->assertJsonPath('verification_allowance.is_pro', false)
        ->assertJsonPath('verification_allowance.can_start_checkout', false);
    $this->getJson('/api/v1/storefront/products?per_page=100')->assertOk()
        ->assertJsonPath('data.0.sales_count', 10);
    $this->getJson('/api/v1/billing/direct')->assertOk()
        ->assertJsonPath('verification_allowance.consumed', 10)
        ->assertJsonPath('verification_allowance.remaining', 0)
        ->assertJsonPath('verification_allowance.is_pro', false)
        ->assertJsonPath('pro_plan.monthly_price_cents', $proCents)
        ->assertJsonPath('pro_subscription.status', 'inactive');

    $startedPro = $this->postJson('/api/v1/billing/direct/pro')->assertOk()
        ->assertJsonPath('amount_cents', $proCents)
        ->assertJsonPath('currency', 'ETB');
    $this->postJson('/api/v1/billing/direct/pro/'.$startedPro->json('payment_id').'/reference', [
        'reference' => 'WRONGAMTPRO1',
    ])->assertOk()->assertJsonPath('status', 'mismatch');
    expect(Subscription::query()->where('user_id', $creator->id)->where('gateway_name', 'verify_et')->exists())->toBeFalse();
    $this->getJson('/api/v1/billing/direct')->assertOk()
        ->assertJsonPath('verification_allowance.is_pro', false)
        ->assertJsonPath('pro_subscription.payments.0.status', 'rejected');

    $this->postJson('/api/v1/billing/direct/pro/'.$startedPro->json('payment_id').'/reference', [
        'reference' => 'PROPAY000001',
    ])->assertOk()->assertJsonPath('status', 'success');
    expect(app(CreatorVerificationAllowance::class)->isPro($creator->fresh()))->toBeTrue();
    $this->getJson('/api/v1/billing/direct')->assertOk()
        ->assertJsonPath('verification_allowance.is_pro', true)
        ->assertJsonPath('verification_allowance.can_start_checkout', true)
        ->assertJsonPath('pro_subscription.status', 'active')
        ->assertJsonPath('pro_subscription.payments.0.amount_cents', $proCents);

    $this->app['auth']->forgetGuards();
    $this->flushSession();
    $this->withHeader('Referer', config('app.url'));
    $this->getJson($base)->assertOk()->assertJsonPath('data.can_buy', true);
    $proSale = $this->postJson("{$base}/checkout", [
        'buyer_name' => 'Nathnael',
        'buyer_email' => 'nathnael-pro-sale@example.test',
        'creator_payment_method_id' => $method->id,
    ])->assertOk()->json();
    $this->withHeader('X-Order-Access-Token', $proSale['access_token'])
        ->postJson($proSale['reference_endpoint'], ['reference' => 'PROSALE00001'])
        ->assertOk()
        ->assertJsonPath('status', 'paid');
    $proOrder = StorefrontOrder::query()->where('uuid', $proSale['order_id'])->firstOrFail();
    expect($proOrder->monetization_policy)->toBe(CreatorVerificationAllowance::PRO_POLICY)
        ->and($proOrder->commission_bps)->toBe(0)
        ->and(DB::table('creator_verification_allowances')->where('creator_id', $creator->id)->where('status', 'consumed')->count())->toBe(10);

    $active = $insights();
    expect($active['sales']['paid_orders'] - $before['sales']['paid_orders'])->toBe(11)
        ->and($active['subscriptions']['direct_revenue_cents'] - $before['subscriptions']['direct_revenue_cents'])->toBe($proCents)
        ->and($active['subscriptions']['pro_creators'] - $before['subscriptions']['pro_creators'])->toBe(1);

    Subscription::query()->where('user_id', $creator->id)->where('gateway_name', 'verify_et')->whereNull('ends_at')
        ->update(['renews_at' => now()->subDays(8)]);
    app(ProcessDirectSubscriptionRenewals::class)->handle();
    expect(app(CreatorVerificationAllowance::class)->isPro($creator->fresh()))->toBeFalse()
        ->and(DB::table('creator_verification_allowances')->where('creator_id', $creator->id)->where('status', 'consumed')->count())->toBe(10);

    $this->postJson("{$base}/checkout", [
        'buyer_name' => 'Nathnael',
        'buyer_email' => 'nathnael-after-expiry@example.test',
        'creator_payment_method_id' => $method->id,
    ])->assertStatus(422)->assertJsonPath(
        'errors.payment.0',
        'All free verified-sale allowances are used or reserved. Upgrade to Pro to continue.',
    );

    $this->flushSession();
    $this->withSession(['_token' => 'free-to-pro']);
    $this->withHeader('X-CSRF-TOKEN', 'free-to-pro');
    $this->postJson('/auth/login', [
        'email' => $creator->email,
        'password' => $password,
    ])->assertOk();
    $this->app['auth']->forgetGuards();
    ActiveWorkspace::clearCache();
    $this->getJson('/api/v1/storefront/direct-orders')->assertOk()
        ->assertJsonPath('summary.verified_sales_count', 11)
        ->assertJsonPath('verification_allowance.consumed', 10)
        ->assertJsonPath('verification_allowance.is_pro', false)
        ->assertJsonPath('verification_allowance.can_start_checkout', false);
    $this->getJson('/api/v1/billing/direct')->assertOk()
        ->assertJsonPath('verification_allowance.consumed', 10)
        ->assertJsonPath('verification_allowance.is_pro', false)
        ->assertJsonPath('pro_subscription.status', 'expired');

    $expired = $insights();
    expect($expired['subscriptions']['pro_creators'])->toBe($before['subscriptions']['pro_creators'])
        ->and($expired['sales']['paid_orders'] - $before['sales']['paid_orders'])->toBe(11)
        ->and($expired['subscriptions']['direct_revenue_cents'] - $before['subscriptions']['direct_revenue_cents'])->toBe($proCents);

    $file->getDisk()->delete($file->getStoragePath());
});
