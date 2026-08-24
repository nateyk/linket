<?php

use App\Stores\Models\Store;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\StorefrontWebhookHandler;
use App\Storefront\DigitalProductVisibility;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Common\Files\FileEntry;
use Psr\Log\AbstractLogger;

uses(\Illuminate\Foundation\Testing\DatabaseTransactions::class);

it('logs store_id not biolink_id', function () {
    $logger = new class extends AbstractLogger {
        public array $records = [];
        public function log($level, string|\Stringable $message, array $context = []): void
        {
            $this->records[] = [
                'level' => $level,
                'message' => (string) $message,
                'context' => $context,
            ];
        }
    };
    $original = Log::getFacadeRoot();
    Log::swap($logger);

    try {
        $user = \App\Models\User::factory()->create();
        $workspace = $user->workspaces()->first() ?? \Common\Workspaces\Models\Workspace::factory()->create(['owner_id' => $user->id]);
        $store = Store::factory()->create(['workspace_id' => $workspace->id, 'user_id' => $user->id]);

        $product = DigitalProduct::create([
            'workspace_id' => $workspace->id,
            'user_id' => $user->id,
            'title' => 'Test Product',
            'price_cents' => 1000,
            'currency' => 'ETB',
            'status' => 'approved',
        ]);

        $file = FileEntry::query()->create([
            'name' => 'test.pdf',
            'file_name' => 'test-' . Str::random(6) . '.pdf',
            'mime' => 'application/pdf',
            'extension' => 'pdf',
            'file_size' => 1024,
            'type' => 'file',
            'public' => 1,
            'user_id' => (string) $user->id,
            'disk_prefix' => 'uploads',
            'workspace_id' => $workspace->id,
        ]);
        $product->files()->attach($file->id);

        $order = StorefrontOrder::create([
            'uuid' => (string) Str::uuid(),
            'digital_product_id' => $product->id,
            'biolink_id' => $store->id,
            'creator_id' => $user->id,
            'buyer_email' => 'buyer@test.com',
            'buyer_name' => 'Test Buyer',
            'currency' => 'ETB',
            'gross_amount_cents' => 1000,
            'commission_bps' => 500,
            'platform_fee_percent' => 5,
            'platform_fee_cents' => 50,
            'creator_earnings_cents' => 950,
            'status' => 'pending',
        ]);

        app(StorefrontWebhookHandler::class)->fulfill($order, 'a@b.com');

        $payload = json_encode($logger->records);

        expect($payload)->toContain('store_id');
        expect($payload)->not->toContain('biolink_id');
    } finally {
        Log::swap($original);
    }
});

it('logs visibility sync with store_id', function () {
    $logger = new class extends AbstractLogger {
        public array $records = [];
        public function log($level, string|\Stringable $message, array $context = []): void
        {
            $this->records[] = [
                'level' => $level,
                'message' => (string) $message,
                'context' => $context,
            ];
        }
    };
    $original = Log::getFacadeRoot();
    Log::swap($logger);

    try {
        $user = \App\Models\User::factory()->create();
        $workspace = $user->workspaces()->first() ?? \Common\Workspaces\Models\Workspace::factory()->create(['owner_id' => $user->id]);
        $store = Store::factory()->create(['workspace_id' => $workspace->id, 'user_id' => $user->id]);

        $product = DigitalProduct::create([
            'workspace_id' => $workspace->id,
            'user_id' => $user->id,
            'title' => 'Visibility Product',
            'price_cents' => 500,
            'currency' => 'ETB',
            'status' => 'approved',
        ]);

        $this->actingAs($user);
        \Illuminate\Support\Facades\Gate::before(fn () => true);

        app(DigitalProductVisibility::class)->sync($product, [$store->id]);

        $payload = json_encode($logger->records);
        expect($payload)->toContain('store_id');
        expect($payload)->not->toContain('biolink_id');
    } finally {
        Log::swap($original);
        \Illuminate\Support\Facades\Gate::before(fn () => null);
    }
});
