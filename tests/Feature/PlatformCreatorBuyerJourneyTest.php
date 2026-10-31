<?php

use App\Models\User;
use App\Payments\Models\DirectPaymentVerification;
use App\Payments\VerifyEt\ReceiptReference;
use App\Storefront\Models\CommissionAccrual;
use App\Storefront\Models\CreatorPaymentMethod;
use App\Storefront\Models\DirectPaymentMethod;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\OrderRecoveryService;
use App\Stores\Models\Store;
use Common\Database\Seeders\RolesTableSeeder;
use Common\Files\FileEntry;
use Common\Permissions\Models\Permission;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;

uses(DatabaseTransactions::class);

test('a synthetic creator can sell a telebirr product to a synthetic buyer without a real verification credit', function () {
    expect(strtolower((string) DB::connection()->getDatabaseName()))->toContain('test');

    Queue::fake();
    $this->withoutMiddleware(\Illuminate\Routing\Middleware\ThrottleRequests::class);
    config()->set('services.verify_et.enabled', true);
    config()->set('services.verify_et.mock', false);
    config()->set('services.verify_et.api_key', 'synthetic-platform-journey');
    Http::preventStrayRequests();
    $this->seed(RolesTableSeeder::class);
    settings()->save([
        'registration.disable' => false,
        'require_email_confirmation' => false,
        'product.adding_requires_review' => true,
        'kyc.enabled' => true,
    ]);

    $suffix = substr(md5((string) microtime(true)), 0, 8);
    $creatorEmail = "mintesnot.teshome.{$suffix}@example.test";
    $buyerEmail = "nathnael.buyer.{$suffix}@example.test";
    $adminEmail = "isolated.admin.{$suffix}@example.test";
    $password = 'JourneyPassword123!';
    $wallet = '0911002470';
    $rejectedWallet = '0911002472';
    $suspendedWallet = '0911002473';
    $fileBytes = "%PDF-1.4\nlinket-platform-journey-2470\n";
    $historicalReference = 'DJR9DBHTEF';
    $paidReference = 'SYNTH2470PAY';
    $adminPasswordBefore = User::query()->where('email', 'admin@admin.com')->value('password');

    expect(app(ReceiptReference::class)->normalize('telebirr', $historicalReference))->toBe($historicalReference);

    $login = function (string $email) use ($password) {
        $this->postJson('/auth/logout');
        $this->app['auth']->forgetGuards();
        $this->flushSession();
        $this->withSession(['_token' => 'platform-journey']);
        $this->withHeader('Referer', config('app.url'));
        $this->withHeader('X-CSRF-TOKEN', 'platform-journey');
        $this->postJson('/auth/login', [
            'email' => $email,
            'password' => $password,
        ])->assertOk();
        $this->app['auth']->forgetGuards();
        ActiveWorkspace::clearCache();
    };

    $this->flushSession();
    $this->withSession(['_token' => 'platform-journey']);
    $this->withHeader('Referer', config('app.url'));
    $this->withHeader('X-CSRF-TOKEN', 'platform-journey');
    $this->postJson('/auth/register', [
        'email' => $creatorEmail,
        'password' => $password,
        'password_confirmation' => $password,
    ])->assertOk();
    $creator = User::query()->where('email', $creatorEmail)->firstOrFail();
    $this->assertAuthenticatedAs($creator);
    $this->putJson("/api/v1/users/{$creator->id}", ['name' => 'Mintesnot Teshome'])->assertOk();
    expect($creator->fresh()->name)->toBe('Mintesnot Teshome');

    $workspace = $creator->workspaces()->where('is_personal', true)->firstOrFail();
    $store = Store::query()->where('user_id', $creator->id)->where('workspace_id', $workspace->id)->firstOrFail();
    $this->putJson("/api/v1/biolinks/{$store->id}/creator-profile", [
        'display_name' => 'Mintesnot Teshome',
        'bio' => 'Synthetic storefront for the isolated platform journey.',
        'available_for_work' => false,
        'skills' => [],
        'social_links' => [],
        'featured_product_ids' => [],
    ])->assertOk();
    expect($store->fresh()->profile_config['display_name'])->toBe('Mintesnot Teshome');

    $this->post('/api/v1/kyc', [
        'document_type' => 'national_id',
        'document_number' => 'SYNTH-'.$suffix,
        'front_of_id_file' => UploadedFile::fake()->image('front.jpg'),
        'back_of_id_file' => UploadedFile::fake()->image('back.jpg'),
        'selfie_file' => UploadedFile::fake()->image('selfie.jpg'),
    ])->assertCreated();
    expect($creator->fresh()->kyc_status)->toBe('pending');

    DirectPaymentMethod::query()->where('code', 'telebirr')->update([
        'creator_setup_enabled' => true,
        'checkout_enabled' => true,
        'automated_verification_supported' => true,
        'recipient_matching_supported' => true,
        'operationally_suspended' => false,
    ]);
    $proof = UploadedFile::fake()->create('telebirr-proof.pdf', 12, 'application/pdf');
    $methodId = $this->post('/api/v1/storefront/payment-methods', [
        'provider' => 'telebirr',
        'account_number' => $wallet,
        'account_name' => 'Mintesnot Teshome',
        'proof' => $proof,
    ])->assertCreated()->json('data.id');
    $this->getJson('/api/v1/storefront/payment-methods')->assertOk()
        ->assertJsonFragment(['id' => $methodId, 'checkout_eligible' => false]);

    $rejectedId = $this->post('/api/v1/storefront/payment-methods', [
        'provider' => 'telebirr',
        'account_number' => $rejectedWallet,
        'account_name' => 'Mintesnot Teshome',
        'proof' => UploadedFile::fake()->create('rejected-proof.pdf', 12, 'application/pdf'),
    ])->assertCreated()->json('data.id');
    $suspendedId = $this->post('/api/v1/storefront/payment-methods', [
        'provider' => 'telebirr',
        'account_number' => $suspendedWallet,
        'account_name' => 'Mintesnot Teshome',
        'proof' => UploadedFile::fake()->create('suspended-proof.pdf', 12, 'application/pdf'),
    ])->assertCreated()->json('data.id');

    $upload = $this->post('/api/v1/file-entries', [
        'file' => UploadedFile::fake()->createWithContent('field-guide.pdf', $fileBytes),
        'workspaceId' => $workspace->id,
        'uploadType' => 'digitalProductFiles',
    ])->assertOk();
    $file = FileEntry::query()->findOrFail($upload->json('fileEntry.id'));
    expect($file->getDisk()->get($file->getStoragePath()))->toBe($fileBytes);

    $productId = $this->postJson('/api/v1/items', [
        'title' => 'Mintesnot field guide',
        'description' => 'Synthetic digital product priced at ETB 2470.',
        'price_cents' => 247000,
        'currency' => 'ETB',
        'file_ids' => [$file->id],
        'biolink_ids' => [$store->id],
    ])->assertCreated()->json('data.id');
    $this->postJson("/api/v1/items/{$productId}/submit")->assertOk();
    $this->getJson('/api/v1/storefront/products?per_page=100')->assertOk()
        ->assertJsonPath('data.0.status', 'pending_approval')
        ->assertJsonPath('data.0.price_cents', 247000);
    $this->getJson('/api/v1/storefront/direct-orders')->assertOk()
        ->assertJsonPath('verification_allowance.is_pro', false)
        ->assertJsonPath('totals.sales_count', 0);

    $publicBase = "/api/v1/public/biolinks/{$store->id}/digital-products/{$productId}";
    $this->getJson($publicBase)->assertNotFound();
    $this->postJson("{$publicBase}/checkout", [
        'buyer_name' => 'Nathnael',
        'buyer_email' => $buyerEmail,
        'creator_payment_method_id' => $methodId,
    ])->assertNotFound();

    $admin = User::query()->forceCreate([
        'name' => 'Isolated Journey Admin',
        'username' => 'isolated-admin-'.$suffix,
        'email' => $adminEmail,
        'password' => bcrypt($password),
        'email_verified_at' => now(),
    ]);
    $admin->permissions()->attach(Permission::query()->firstOrCreate(['name' => 'admin']));
    $login($adminEmail);
    $this->app['auth']->user()->loadPermissions(true);

    $kycId = $creator->fresh()->latestKycVerification->id;
    $this->getJson("/api/v1/admin/kyc-verifications/{$kycId}")->assertOk();
    $this->postJson("/api/v1/admin/kyc-verifications/{$kycId}/approve")->assertOk();
    expect($creator->fresh()->kyc_status)->toBe('approved');

    $this->postJson("/api/v1/admin/storefront/payment-methods/{$rejectedId}/reject", [
        'reason' => 'Ownership evidence does not match the wallet.',
    ])->assertOk();
    $this->getJson("/api/v1/admin/storefront/payment-methods/{$methodId}")->assertOk()
        ->assertJsonPath('data.checkout_eligible', false)
        ->assertJsonFragment(['checkout_blockers' => ['linket_approval', 'verify_et', 'creator_activation']]);
    $this->postJson("/api/v1/admin/storefront/payment-methods/{$methodId}/provider-registration")->assertStatus(409);
    $this->postJson("/api/v1/admin/storefront/payment-methods/{$methodId}/approve")->assertOk()
        ->assertJsonPath('data.checkout_eligible', false);
    $this->postJson("/api/v1/admin/storefront/payment-methods/{$methodId}/provider-registration")->assertOk()
        ->assertJsonPath('data.checkout_eligible', false);
    $this->postJson("/api/v1/admin/storefront/payment-methods/{$suspendedId}/approve")->assertOk();
    $this->postJson("/api/v1/admin/storefront/payment-methods/{$suspendedId}/provider-registration")->assertOk();

    $this->getJson("/api/v1/admin/items/{$productId}")->assertOk()
        ->assertJsonPath('data.creator.email', $creatorEmail)
        ->assertJsonPath('data.price_cents', 247000);
    $adminFile = $this->get("/api/v1/admin/items/{$productId}/files/{$file->id}");
    $adminFile->assertOk();
    expect($adminFile->streamedContent())->toBe($fileBytes);

    $login($creatorEmail);
    $this->postJson("/api/v1/storefront/payment-methods/{$methodId}/activate")->assertOk();
    $this->getJson('/api/v1/storefront/payment-methods')->assertOk()
        ->assertJsonFragment(['id' => $methodId, 'checkout_eligible' => true]);
    $this->postJson("/api/v1/storefront/payment-methods/{$suspendedId}/activate")->assertOk();

    $login($adminEmail);
    $this->postJson("/api/v1/admin/storefront/payment-methods/{$suspendedId}/suspend", [
        'reason' => 'Synthetic suspension blocks selling.',
    ])->assertOk()->assertJsonPath('data.checkout_eligible', false);
    $this->postJson("/api/v1/admin/items/{$productId}/approve")->assertOk();

    $this->postJson('/auth/logout')->assertSuccessful();
    $this->app['auth']->forgetGuards();
    $this->flushSession();
    $this->withHeader('Referer', config('app.url'));

    $this->get('/'.$store->back_half)->assertOk()->assertSee('Mintesnot Teshome');
    $this->getJson($publicBase)->assertOk()
        ->assertJsonPath('data.price_cents', 247000)
        ->assertJsonPath('data.can_buy', true);
    $this->postJson("{$publicBase}/checkout", [
        'buyer_name' => 'Nathnael',
        'buyer_email' => $buyerEmail,
        'creator_payment_method_id' => $rejectedId,
    ])->assertStatus(422);
    $this->postJson("{$publicBase}/checkout", [
        'buyer_name' => 'Nathnael',
        'buyer_email' => $buyerEmail,
        'creator_payment_method_id' => $suspendedId,
    ])->assertStatus(422);

    $evidence = function (string $reference, array $overrides = []) use ($wallet): array {
        $item = array_replace([
            'bank' => 'telebirr',
            'status' => 'success',
            'verified' => true,
            'amount' => '2470.00',
            'currency' => 'ETB',
            'transactionNumber' => $reference,
            'payerName' => 'Nathnael',
            'receiverName' => 'Mintesnot Teshome',
            'completedAt' => '2026-10-27T12:00:00+03:00',
        ], $overrides);
        $item['settlementAccountMatch'] = $overrides['settlementAccountMatch'] ?? [
            'matched' => true,
            'ambiguous' => false,
            'matchConfidence' => 'high',
            'candidateCount' => 1,
            'matchedSettlementAccount' => $wallet,
        ];

        return [
            'requestId' => 'req-'.$reference,
            'verification' => ['processingStatus' => 'completed', 'status' => 'success', 'verified' => true],
            'data' => [$item],
        ];
    };

    $happyQueued = false;
    Http::fake(function (\Illuminate\Http\Client\Request $request) use ($evidence, $paidReference, $historicalReference, $wallet, &$happyQueued) {
        $reference = (string) ($request->data()['transactionNumber'] ?? '');
        if ($reference === $historicalReference) {
            return Http::response($evidence($historicalReference, [
                'status' => 'failed',
                'verified' => false,
            ]), 200);
        }
        if (strtoupper($request->method()) === 'GET') {
            return Http::response($evidence($paidReference), 200);
        }
        if ($reference === $paidReference && ! $happyQueued) {
            $happyQueued = true;

            return Http::response([
                'requestId' => 'req-'.$paidReference,
                'verification' => ['processingStatus' => 'queued'],
            ], 202);
        }

        $overrides = match (true) {
            str_starts_with($reference, 'WRONGDEST') => ['settlementAccountMatch' => [
                'matched' => true, 'ambiguous' => false, 'matchConfidence' => 'high', 'candidateCount' => 1,
                'matchedSettlementAccount' => '0911999999',
            ]],
            str_starts_with($reference, 'WRONGAMT') => ['amount' => '1.00'],
            str_starts_with($reference, 'NOCURREN') => ['currency' => null],
            str_starts_with($reference, 'LOWCONF') => ['settlementAccountMatch' => [
                'matched' => true, 'ambiguous' => false, 'matchConfidence' => 'low', 'candidateCount' => 1,
                'matchedSettlementAccount' => $wallet,
            ]],
            default => [],
        };

        return Http::response($evidence($reference, $overrides), 200);
    });
    $transport = Mockery::mock(\App\Payments\VerifyEt\VerifyEtHttp::class);
    $transport->shouldReceive('factory')->andReturn(Http::getFacadeRoot());
    app()->instance(\App\Payments\VerifyEt\VerifyEtHttp::class, $transport);

    $submit = function (array $started, string $reference) {
        $this->withHeader('X-Order-Access-Token', $started['access_token'])
            ->getJson($started['instructions_endpoint'])
            ->assertOk()
            ->assertJsonPath('data.amount_cents', 247000)
            ->assertJsonPath('data.currency', 'ETB')
            ->assertJsonPath('data.provider', 'telebirr')
            ->assertJsonPath('data.account_name', 'Mintesnot Teshome');
        $pending = $this->withHeader('X-Order-Access-Token', $started['access_token'])
            ->getJson($started['status_endpoint'])->assertOk();
        expect($pending->json('data.downloads'))->toBe([]);

        return $this->withHeader('X-Order-Access-Token', $started['access_token'])
            ->postJson($started['reference_endpoint'], ['reference' => $reference]);
    };

    $start = function () use ($publicBase, $buyerEmail, $methodId) {
        return $this->postJson("{$publicBase}/checkout", [
            'buyer_name' => 'Nathnael',
            'buyer_email' => $buyerEmail,
            'creator_payment_method_id' => $methodId,
        ])->assertOk()->json();
    };

    $wrongRecipient = $start();
    $submit($wrongRecipient, 'WRONGDEST01')->assertOk()->assertJsonPath('status', 'failed_verification');
    expect(StorefrontOrder::query()->where('uuid', $wrongRecipient['order_id'])->value('status'))->not->toBe('paid');

    $wrongAmount = $start();
    $submit($wrongAmount, 'WRONGAMT0001')->assertOk()->assertJsonPath('status', 'failed_verification');

    $missingCurrency = $start();
    $submit($missingCurrency, 'NOCURREN0001')->assertOk()->assertJsonPath('status', 'failed_verification');

    $lowConfidence = $start();
    $submit($lowConfidence, 'LOWCONF00001')->assertOk()->assertJsonPath('status', 'manual_review');
    expect(StorefrontOrder::query()->where('uuid', $lowConfidence['order_id'])->value('status'))->toBe('manual_review');

    $historical = $start();
    $submit($historical, $historicalReference)->assertOk()->assertJsonPath('status', 'failed_verification');
    expect(StorefrontOrder::query()->where('uuid', $historical['order_id'])->value('status'))->not->toBe('paid');

    $paid = $start();
    expect($paid['access_token'])->not->toBeEmpty();
    $submit($paid, $paidReference)->assertOk()->assertJsonPath('status', 'verifying');
    $this->withHeader('X-Order-Access-Token', $paid['access_token'])
        ->postJson("/api/v1/public/direct-orders/{$paid['order_id']}/recheck")
        ->assertOk()
        ->assertJsonPath('status', 'paid');
    Http::assertSent(fn ($request): bool => ($request->data()['transactionNumber'] ?? null) === $paidReference);

    $order = StorefrontOrder::query()->where('uuid', $paid['order_id'])->firstOrFail();
    expect($order->status)->toBe('paid')
        ->and($order->commission_bps)->toBe(0)
        ->and($order->platform_fee_cents)->toBe(0)
        ->and($order->gross_amount_cents)->toBe(247000)
        ->and($order->monetization_policy)->toBe('verified_sales_free_v1');
    expect(CommissionAccrual::query()->where('storefront_order_id', $order->id)->count())->toBe(0);
    expect(DB::table('creator_verification_allowances')->where('creator_id', $creator->id)->where('status', 'consumed')->count())->toBe(1);

    $this->withHeader('X-Order-Access-Token', 'not-nathnael')
        ->getJson("/api/v1/public/direct-orders/{$paid['order_id']}")
        ->assertForbidden();
    $paidView = $this->withHeader('X-Order-Access-Token', $paid['access_token'])
        ->getJson("/api/v1/public/direct-orders/{$paid['order_id']}")
        ->assertOk()
        ->assertJsonCount(1, 'data.downloads');
    $downloadUrl = $paidView->json('data.downloads.0.url');
    expect($this->get($downloadUrl)->assertOk()->streamedContent())->toBe($fileBytes);
    expect($this->get($downloadUrl)->assertOk()->streamedContent())->toBe($fileBytes);

    $this->withHeader('X-Order-Access-Token', $paid['access_token'])
        ->postJson($paid['reference_endpoint'], ['reference' => $paidReference])
        ->assertStatus(409);
    app(\App\Payments\VerifyEt\VerifyEtGateway::class)->processResult(
        DirectPaymentVerification::query()->where('reference', $paidReference)->firstOrFail(),
        $evidence($paidReference),
    );
    expect(DB::table('creator_verification_allowances')->where('creator_id', $creator->id)->where('status', 'consumed')->count())->toBe(1);

    $duplicate = $start();
    $this->withHeader('X-Order-Access-Token', $duplicate['access_token'])
        ->postJson($duplicate['reference_endpoint'], ['reference' => $paidReference])
        ->assertStatus(422);
    expect(StorefrontOrder::query()->where('uuid', $duplicate['order_id'])->value('status'))->not->toBe('paid');

    config()->set('services.verify_et.mock', true);
    \Illuminate\Support\Facades\RateLimiter::clear('digital-product-recovery:email:'.hash('sha256', $buyerEmail));
    \Illuminate\Support\Facades\RateLimiter::clear('digital-product-recovery:ip:127.0.0.1');
    $this->postJson('/api/v1/public/my-portal/request-code', ['email' => $buyerEmail])->assertOk();
    $code = json_decode((string) file_get_contents(storage_path('app/e2e/last-recovery-code.json')), true);
    expect($code['email'])->toBe($buyerEmail);
    config()->set('app.url', 'http://localhost');
    config()->set('sanctum.stateful', ['localhost']);
    $verified = $this->withCredentials()->withHeader('Referer', 'http://localhost')
        ->postJson('/api/v1/public/my-portal/verify-code', [
            'email' => $buyerEmail,
            'code' => $code['code'],
        ])->assertOk();
    $cookie = $verified->getCookie(OrderRecoveryService::COOKIE, decrypt: false);
    expect($cookie)->not->toBeNull();
    $portal = $this->withCredentials()->withHeader('Referer', 'http://localhost')
        ->withUnencryptedCookies([OrderRecoveryService::COOKIE => $cookie->getValue()]);
    $purchases = $portal->getJson('/api/v1/public/my-portal/purchases')
        ->assertOk()
        ->json('orders');
    $recovered = collect($purchases)->firstWhere('id', $order->uuid);
    expect($recovered)->not->toBeNull();
    $portalDownload = $this->withCredentials()->withHeader('Referer', 'http://localhost')
        ->withUnencryptedCookies([OrderRecoveryService::COOKIE => $cookie->getValue()])
        ->postJson('/api/v1/public/my-portal/purchases/'.$order->uuid.'/downloads/'.$order->entitlements()->value('id'))
        ->assertOk();
    expect($this->get($portalDownload->json('url'))->assertOk()->streamedContent())->toBe($fileBytes);

    $this->withCredentials()->withHeader('Referer', 'http://localhost')
        ->withUnencryptedCookies([OrderRecoveryService::COOKIE => 'other-buyer-session'])
        ->getJson('/api/v1/public/my-portal/purchases')
        ->assertForbidden();

    $login($creatorEmail);
    $this->getJson('/api/v1/storefront/products?per_page=100')->assertOk()
        ->assertJsonPath('data.0.id', $productId)
        ->assertJsonPath('data.0.sales_count', 1)
        ->assertJsonPath('data.0.status', 'approved');
    $this->getJson('/api/v1/storefront/direct-orders?status=paid&search=Nathnael')->assertOk()
        ->assertJsonPath('totals.sales_count', 1)
        ->assertJsonPath('totals.sales_cents', 247000)
        ->assertJsonPath('verification_allowance.is_pro', false);

    expect(User::query()->where('email', 'admin@admin.com')->value('password'))->toBe($adminPasswordBefore);
    expect(DirectPaymentVerification::query()->where('reference', $historicalReference)->where('status', 'success')->exists())->toBeFalse();

    $file->getDisk()->delete($file->getStoragePath());
    foreach (CreatorPaymentMethod::query()->whereIn('id', [$methodId, $rejectedId, $suspendedId])->pluck('proof_path') as $proofPath) {
        if (is_string($proofPath)) {
            \Illuminate\Support\Facades\Storage::disk('local')->delete($proofPath);
        }
    }
    $kyc = $creator->fresh()->latestKycVerification;
    if ($kyc) {
        foreach ((array) $kyc->documents as $path) {
            if (is_string($path)) {
                \Illuminate\Support\Facades\Storage::disk('local')->delete($path);
            }
        }
    }
});

test('registration still creates a storefront when the guest role is missing', function () {
    expect(strtolower((string) DB::connection()->getDatabaseName()))->toContain('test');
    \Common\Roles\Models\Role::query()->where('guests', true)->delete();
    settings()->save(['registration.disable' => false, 'require_email_confirmation' => false]);
    $email = 'guest-role-missing-'.substr(md5((string) microtime(true)), 0, 8).'@example.test';

    $this->withHeader('Referer', config('app.url'))->postJson('/auth/register', [
        'email' => $email,
        'password' => 'JourneyPassword123!',
        'password_confirmation' => 'JourneyPassword123!',
    ])->assertOk();

    $user = User::query()->where('email', $email)->firstOrFail();
    expect(Store::query()->where('user_id', $user->id)->exists())->toBeTrue();
});
