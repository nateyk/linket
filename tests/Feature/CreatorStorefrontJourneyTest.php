<?php

use App\Models\User;
use App\Stores\Models\Store;
use Common\Database\Seeders\RolesTableSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Storefront\Models\DigitalProduct;
use Common\Files\FileEntry;
use App\Storefront\Models\CreatorPaymentMethod;
use App\Storefront\Models\DirectPaymentMethod;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

test('the landing page has usable content when its settings are missing', function () {
    settings()->save(['landingPage' => null]);
    $this->withHeader('Referer', 'http://localhost')
        ->getJson('/api/v1/landing-page-data')
        ->assertOk()
        ->assertJsonPath('sections.0.name', 'hero-split-with-screenshot')
        ->assertJsonPath('sections.0.image.src', 'images/landing/links.webp')
        ->assertJsonFragment(['name' => 'pricing']);
});

test('the landing page preserves configured sections', function () {
    settings()->save(['landingPage' => ['sections' => [['name' => 'hero-simple-centered', 'title' => 'Custom heading']]]]);
    $this->withHeader('Referer', 'http://localhost')
        ->getJson('/api/v1/landing-page-data')
        ->assertOk()
        ->assertJsonPath('sections.0.title', 'Custom heading');
});

test('a new creator can register, customize their storefront and open it as a guest', function () {
    $this->seed(RolesTableSeeder::class);
    settings()->save(['registration.disable' => false, 'require_email_confirmation' => false]);

    $this->postJson('/auth/register', [
        'email' => 'journey-creator@example.test',
        'password' => 'JourneyPassword123!',
        'password_confirmation' => 'JourneyPassword123!',
    ])->assertOk();

    $creator = User::where('email', 'journey-creator@example.test')->firstOrFail();
    $this->assertAuthenticatedAs($creator);
    $workspace = $creator->workspaces()->where('is_personal', true)->firstOrFail();
    $store = Store::where('user_id', $creator->id)->where('workspace_id', $workspace->id)->firstOrFail();
    expect($store->back_half)->not->toBeEmpty();

    $this->withHeader('Referer', 'http://localhost')
        ->getJson('/api/v1/stores?per_page=100')
        ->assertOk()
        ->assertJsonFragment(['id' => $store->id]);
    $this->getJson('/api/v1/storefront/products?per_page=100')
        ->assertOk()
        ->assertJsonPath('data', []);
    $this->getJson('/api/v1/storefront/payment-methods')
        ->assertOk()
        ->assertJsonPath('data', []);

    $this->withHeader('Referer', 'http://localhost')->postJson('/api/v1/workspaces', [
        'name' => 'Second workspace',
    ])->assertUnprocessable();

    $this->withHeader('Referer', 'http://localhost')->putJson("/api/v1/biolinks/{$store->id}/creator-profile", [
        'display_name' => 'Journey Creator',
        'bio' => 'Welcome to my storefront.',
        'available_for_work' => false,
        'skills' => [],
        'social_links' => [],
        'featured_product_ids' => [],
    ])->assertOk();

    expect($store->fresh()->profile_config['display_name'])->toBe('Journey Creator');
    $this->postJson('/auth/logout')->assertSuccessful();
    $this->get('/'.$store->back_half)->assertOk()->assertSee('Journey Creator');
    $this->postJson('/auth/login', [
        'email' => 'journey-creator@example.test',
        'password' => 'JourneyPassword123!',
    ])->assertOk();
    $this->assertAuthenticatedAs($creator);
});

test('a storefront order without a payment reference cannot be opened without proof', function () {
    config()->set('services.verify_et.enabled', false);
    $creator = User::factory()->create();
    $workspace = (new \Common\Workspaces\Actions\CreateWorkspace())->createPersonalWorkspace($creator);
    $store = Store::factory()->create(['workspace_id' => $workspace->id, 'user_id' => $creator->id]);
    $product = DigitalProduct::create([
        'workspace_id' => $workspace->id, 'user_id' => $creator->id,
        'title' => 'Free guide', 'price_cents' => 0, 'currency' => 'ETB', 'status' => 'approved', 'type' => 'digital',
    ]);
    $file = FileEntry::create([
        'name' => 'guide.pdf', 'file_name' => 'journey-guide.pdf', 'mime' => 'application/pdf',
        'extension' => 'pdf', 'type' => 'file', 'file_size' => 100,
        'workspace_id' => $workspace->id, 'owner_id' => $creator->id,
    ]);
    $product->files()->attach($file->id);
    $product->biolinks()->attach($store->id);
    $this->withHeader('Referer', 'http://localhost');
    $checkout = $this->postJson("/api/v1/public/biolinks/{$store->id}/digital-products/{$product->id}/checkout", [
        'buyer_name' => 'Buyer', 'buyer_email' => 'journey-buyer@example.test',
    ])->assertOk();
    $order = $checkout->json('order_id');
    $this->getJson("/api/v1/public/biolinks/{$store->id}/digital-products/{$product->id}/orders/{$order}")->assertForbidden();
    $this->getJson("/storefront/orders/{$order}/success")->assertForbidden();
    $this->getJson("/{$store->back_half}/products/{$product->id}/orders/{$order}/success")->assertForbidden();
});

test('a buyer can browse a paid product but cannot pay while verification is unavailable', function () {
    config()->set('services.verify_et.enabled', false);
    $creator = User::factory()->create();
    $workspace = (new \Common\Workspaces\Actions\CreateWorkspace())->createPersonalWorkspace($creator);
    $store = Store::factory()->create(['workspace_id' => $workspace->id, 'user_id' => $creator->id]);
    $product = DigitalProduct::create([
        'workspace_id' => $workspace->id, 'user_id' => $creator->id,
        'title' => 'Paid guide', 'price_cents' => 5000, 'currency' => 'ETB', 'status' => 'approved', 'type' => 'digital',
    ]);
    $file = FileEntry::create([
        'name' => 'guide.pdf', 'file_name' => 'journey-'.Str::uuid().'.pdf', 'mime' => 'application/pdf',
        'extension' => 'pdf', 'type' => 'file', 'file_size' => 100,
        'workspace_id' => $workspace->id, 'owner_id' => $creator->id,
    ]);
    $product->files()->attach($file->id);
    $fileContent = "%PDF-1.4\nLinket delivery test\n";
    $file->getDisk()->put($file->getStoragePath(), $fileContent);
    $product->biolinks()->attach($store->id);
    $this->withHeader('Referer', 'http://localhost');

    $this->get('/'.$store->back_half)->assertOk();
    $base = "/api/v1/public/biolinks/{$store->id}/digital-products";
    $this->getJson($base)->assertOk()->assertJsonFragment(['title' => 'Paid guide']);
    $this->getJson("{$base}/{$product->id}")->assertOk()
        ->assertJsonPath('data.payment_mode', 'unavailable')
        ->assertJsonPath('data.can_buy', false);
    $this->postJson("{$base}/{$product->id}/checkout", [
        'buyer_name' => 'Buyer', 'buyer_email' => 'paid-buyer@example.test',
    ])->assertStatus(503);
    $this->assertDatabaseMissing('storefront_orders', [
        'digital_product_id' => $product->id,
        'status' => 'paid',
    ]);
    $file->getDisk()->delete($file->getStoragePath());
});

test('an authenticated creator sees approved storefront and paid sale progress in product APIs', function () {
    config()->set('services.verify_et.enabled', false);
    $creator = User::factory()->create();
    $workspace = (new \Common\Workspaces\Actions\CreateWorkspace())->createPersonalWorkspace($creator);
    $store = Store::factory()->create(['workspace_id' => $workspace->id, 'user_id' => $creator->id]);
    $product = DigitalProduct::query()->create([
        'workspace_id' => $workspace->id,
        'user_id' => $creator->id,
        'title' => 'Approved creator checklist product',
        'price_cents' => 5000,
        'currency' => 'ETB',
        'status' => 'approved',
        'approved_at' => now(),
        'type' => 'digital',
    ]);
    $file = FileEntry::query()->create([
        'name' => 'creator-progress.pdf',
        'file_name' => 'creator-progress.pdf',
        'mime' => 'application/pdf',
        'extension' => 'pdf',
        'type' => 'file',
        'file_size' => 100,
        'workspace_id' => $workspace->id,
        'owner_id' => $creator->id,
    ]);
    $product->files()->attach($file->id);
    $product->biolinks()->attach($store->id);

    $base = "/api/v1/public/biolinks/{$store->id}/digital-products/{$product->id}";
    $this->withHeader('Referer', 'http://localhost')
        ->postJson("{$base}/checkout", [
            'buyer_name' => 'Progress buyer',
            'buyer_email' => 'progress-buyer@example.test',
        ])
        ->assertStatus(503);

    $this->actingAs($creator)
        ->getJson('/api/v1/storefront/products?per_page=100')
        ->assertOk()
        ->assertJsonPath('data.0.id', $product->id)
        ->assertJsonPath('data.0.status', 'approved')
        ->assertJsonPath('data.0.files.0.id', $file->id)
        ->assertJsonPath('data.0.biolink_ids.0', $store->id)
        ->assertJsonPath('data.0.sales_count', 0);
});

test('creator uploads a product for approval and a buyer receives the approved download', function () {
    config()->set('services.verify_et.enabled', false);
    $this->seed(RolesTableSeeder::class);
    settings()->save(['product.adding_requires_review' => true]);
    settings()->save(['registration.disable' => false, 'require_email_confirmation' => false]);
    $this->postJson('/auth/register', [
        'email' => 'full-journey-creator@example.test',
        'password' => 'JourneyPassword123!',
        'password_confirmation' => 'JourneyPassword123!',
    ])->assertOk();
    $creator = User::query()->where('email', 'full-journey-creator@example.test')->firstOrFail();
    $this->assertAuthenticatedAs($creator);
    $workspace = $creator->workspaces()->where('is_personal', true)->firstOrFail();
    $store = Store::query()->where('workspace_id', $workspace->id)->where('user_id', $creator->id)->firstOrFail();
    \Common\Workspaces\ActiveWorkspace::clearCache();
    $this->withSession(['_token' => 'test-token'])->withHeader('Referer', config('app.url'))->withHeader('X-CSRF-TOKEN', 'test-token')->actingAs($creator);
    $this->getJson('/api/v1/stores?per_page=100')->assertOk()->assertJsonFragment(['id' => $store->id]);
    $this->getJson('/api/v1/storefront/products?per_page=100')->assertOk()->assertJsonPath('data', []);
    $this->getJson('/api/v1/storefront/payment-methods')->assertOk()->assertJsonPath('data', []);

    DirectPaymentMethod::query()->where('code', 'cbe')->update([
        'creator_setup_enabled' => true,
        'checkout_enabled' => true,
        'automated_verification_supported' => true,
        'recipient_matching_supported' => true,
        'operationally_suspended' => false,
    ]);
    $methodId = $this->postJson('/api/v1/storefront/payment-methods', [
        'provider' => 'cbe',
        'account_number' => '1000123456789',
        'account_name' => 'Journey Creator',
        'proof' => \Illuminate\Http\UploadedFile::fake()->create('proof.pdf', 10, 'application/pdf'),
    ])->assertCreated()->json('data.id');
    $paymentMethod = CreatorPaymentMethod::query()->findOrFail($methodId);
    $this->getJson('/api/v1/storefront/payment-methods')->assertOk()
        ->assertJsonFragment(['id' => $methodId, 'checkout_eligible' => false]);

    $content = "%PDF-1.4\nSynthetic journey download\n";
    $upload = $this->post('/api/v1/file-entries', ['file' => \Illuminate\Http\UploadedFile::fake()->createWithContent('journey.pdf', $content), 'workspaceId' => $workspace->id, 'uploadType' => 'digitalProductFiles'])->assertOk();
    $file = FileEntry::query()->findOrFail($upload->json('fileEntry.id'));
    try {
        $created = $this->postJson('/api/v1/items', ['title' => 'Journey workbook', 'price_cents' => 5000, 'currency' => 'ETB', 'file_ids' => [$file->id], 'biolink_ids' => [$store->id]])->assertCreated();
        $id = $created->json('data.id');
        $this->getJson('/api/v1/storefront/products?per_page=100')
            ->assertOk()
            ->assertJsonPath('data.0.status', 'draft')
            ->assertJsonPath('data.0.files.0.id', $file->id)
            ->assertJsonPath('data.0.biolink_ids.0', $store->id);
        $this->postJson("/api/v1/items/{$id}/submit")->assertOk();
        $this->getJson('/api/v1/storefront/products?per_page=100')->assertOk()->assertJsonPath('data.0.status', 'pending_approval');
        $this->getJson("/api/v1/public/biolinks/{$store->id}/digital-products/{$id}")->assertNotFound();
        $admin = User::query()->forceCreate([
            'name' => 'Journey Admin',
            'username' => 'journey-admin',
            'email' => 'journey-admin@example.test',
            'password' => bcrypt('JourneyAdminPassword123!'),
            'email_verified_at' => now(),
        ]);
        $admin->permissions()->attach(\Common\Permissions\Models\Permission::query()->firstOrCreate(['name' => 'admin']));
        $this->postJson('/auth/logout')->assertSuccessful();
        $this->postJson('/auth/login', [
            'email' => 'journey-admin@example.test',
            'password' => 'JourneyAdminPassword123!',
        ])->assertOk();
        $this->assertAuthenticatedAs($admin);
        $this->app['auth']->forgetGuards();
        $this->app['auth']->user()->loadPermissions(true);
        $this->assertTrue($this->app['auth']->user()->hasPermission('admin'));
        $this->assertDatabaseHas('permissionables', [
            'permissionable_type' => $admin->getMorphClass(),
            'permissionable_id' => $admin->id,
            'permission_id' => \Common\Permissions\Models\Permission::query()->where('name', 'admin')->value('id'),
        ]);
        $this->postJson("/api/v1/admin/storefront/payment-methods/{$methodId}/approve")->assertOk();
        $this->postJson("/api/v1/admin/storefront/payment-methods/{$methodId}/provider-registration")->assertOk();
        $this->postJson('/auth/logout')->assertSuccessful();
        $this->app['auth']->forgetGuards();
        $this->postJson('/auth/login', [
            'email' => 'full-journey-creator@example.test',
            'password' => 'JourneyPassword123!',
        ])->assertOk();
        $this->app['auth']->forgetGuards();
        \Common\Workspaces\ActiveWorkspace::clearCache();
        $this->postJson("/api/v1/storefront/payment-methods/{$methodId}/activate")->assertOk();
        $this->getJson('/api/v1/storefront/payment-methods')->assertOk()
            ->assertJsonFragment(['id' => $methodId, 'checkout_eligible' => true]);
        $this->postJson('/auth/logout')->assertSuccessful();
        $this->app['auth']->forgetGuards();
        $this->postJson('/auth/login', [
            'email' => 'journey-admin@example.test',
            'password' => 'JourneyAdminPassword123!',
        ])->assertOk();
        $this->app['auth']->forgetGuards();
        $this->postJson("/api/v1/admin/items/{$id}/approve")->assertOk();
        $this->getJson("/api/v1/public/biolinks/{$store->id}/digital-products/{$id}")->assertOk();
        $base = "/api/v1/public/biolinks/{$store->id}/digital-products/{$id}";
        $this->postJson("{$base}/checkout", ['buyer_name' => 'Buyer', 'buyer_email' => 'journey@example.test'])->assertStatus(503);
        $this->assertDatabaseMissing('storefront_orders', ['digital_product_id' => $id, 'status' => 'paid']);

        config()->set('services.verify_et.enabled', true);
        config()->set('services.verify_et.api_key', 'synthetic-test-key');
        \Illuminate\Support\Facades\Queue::fake();
        \Illuminate\Support\Facades\Http::preventStrayRequests();
        \Illuminate\Support\Facades\Http::fake(['verify.et/api/verify' => \Illuminate\Support\Facades\Http::response([
            'requestId' => 'synthetic-journey-request',
            'verification' => ['processingStatus' => 'completed'],
            'data' => [[
                'bank' => 'cbe', 'status' => 'success', 'verified' => true, 'amount' => 50, 'currency' => 'ETB',
                'receiptNumber' => 'JOURNEYVERIFY123',
                'settlementAccountMatch' => ['matched' => true, 'ambiguous' => false, 'matchConfidence' => 'high', 'candidateCount' => 1, 'matchedSettlementAccount' => '1000123456789'],
            ]],
        ], 200)]);
        $transport = \Mockery::mock(\App\Payments\VerifyEt\VerifyEtHttp::class);
        $transport->shouldReceive('factory')->andReturn(\Illuminate\Support\Facades\Http::getFacadeRoot());
        app()->instance(\App\Payments\VerifyEt\VerifyEtHttp::class, $transport);
        $directCheckout = $this->postJson("{$base}/checkout", [
            'buyer_name' => 'Direct buyer', 'buyer_email' => 'direct-journey@example.test',
            'creator_payment_method_id' => $methodId,
        ])->assertOk();
        $this->withHeader('X-Order-Access-Token', $directCheckout->json('access_token'))
            ->postJson($directCheckout->json('reference_endpoint'), ['reference' => 'JOURNEYVERIFY123'])
            ->assertOk()->assertJsonPath('status', 'paid');
        $this->assertDatabaseHas('storefront_orders', [
            'uuid' => $directCheckout->json('order_id'), 'creator_id' => $creator->id,
            'creator_payment_method_id' => $methodId, 'status' => 'paid',
        ]);
        \Illuminate\Support\Facades\Http::assertSent(fn ($request): bool => $request['bank'] === 'cbe'
            && $request['reference'] === 'JOURNEYVERIFY123'
            && $request['settlementAccount'] === '1000123456789');
        $directOrderUrl = "{$base}/orders/{$directCheckout->json('order_id')}";
        $this->withHeader('X-Order-Access-Token', 'invalid-token')->getJson($directOrderUrl)->assertForbidden();
        $directOrder = $this->withHeader('X-Order-Access-Token', $directCheckout->json('access_token'))
            ->getJson($directOrderUrl)->assertOk()->assertJsonPath('data.status', 'paid')->assertJsonCount(1, 'data.downloads');
        $directDownload = $directOrder->json('data.downloads.0.url');
        expect($this->get($directDownload)->assertOk()->streamedContent())->toBe($content);
        $this->getJson(strtok($directDownload, '?'))->assertForbidden();

        $this->postJson('/auth/logout')->assertSuccessful();
        $this->app['auth']->forgetGuards();
        $this->postJson('/auth/login', [
            'email' => 'full-journey-creator@example.test',
            'password' => 'JourneyPassword123!',
        ])->assertOk();
        $this->app['auth']->forgetGuards();
        \Common\Workspaces\ActiveWorkspace::clearCache();
        $this->getJson('/api/v1/storefront/products?per_page=100')->assertOk()
            ->assertJsonPath('data.0.id', $id)
            ->assertJsonPath('data.0.status', 'approved')
            ->assertJsonPath('data.0.biolink_ids.0', $store->id)
            ->assertJsonPath('data.0.sales_count', 1);
    } finally {
        $file->getDisk()->delete($file->getStoragePath());
        \Illuminate\Support\Facades\Storage::disk('local')->delete($paymentMethod->proof_path);
    }
});
