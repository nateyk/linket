<?php

declare(strict_types=1);

use App\Models\User;
use App\Payments\Models\VerifyEtWebhookDelivery;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

it('reports only aggregate counts and blocks retirement for an unprocessed historical callback', function () {
    $delivery = VerifyEtWebhookDelivery::query()->create([
        'event_id' => (string) Str::uuid(),
        'provider_request_id' => 'synthetic-legacy-request',
        'event_type' => 'verification.completed',
        'status' => 'unmatched',
        'payload' => ['encrypted' => 'synthetic-private-evidence'],
        'received_at' => now(),
    ]);

    $before = DB::table('verify_et_webhook_deliveries')->count();
    $exit = Artisan::call('billing:audit-verify-et-retirement', ['--json' => true]);
    $json = Artisan::output();
    $report = json_decode($json, true, 512, JSON_THROW_ON_ERROR);

    expect($exit)->toBe(1)
        ->and($report['candidate_for_manual_signoff'])->toBeFalse()
        ->and($report['blockers']['unprocessed_webhooks'])->toBeGreaterThanOrEqual(1)
        ->and($report['historical_records']['verify_et_webhook_deliveries'])->toBeGreaterThanOrEqual(1)
        ->and(DB::table('verify_et_webhook_deliveries')->count())->toBe($before)
        ->and($delivery->fresh()->status)->toBe('unmatched')
        ->and($json)->not->toContain('synthetic-private-evidence')
        ->and($json)->not->toContain('synthetic-legacy-request');
});

it('counts legacy unverified orders without changing their payment or delivery state', function () {
    $creator = User::factory()->create();
    $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
    $product = DigitalProduct::query()->create([
        'workspace_id' => $workspace->id,
        'user_id' => $creator->id,
        'title' => 'Synthetic legacy audit product',
        'price_cents' => 4000,
        'currency' => 'ETB',
        'status' => 'approved',
        'approved_at' => now(),
        'type' => 'digital',
    ]);
    $order = StorefrontOrder::query()->create([
        'uuid' => (string) Str::uuid(),
        'digital_product_id' => $product->id,
        'creator_id' => $creator->id,
        'buyer_email' => 'synthetic-buyer@example.test',
        'buyer_name' => 'Synthetic Buyer',
        'currency' => 'ETB',
        'gross_amount_cents' => 4000,
        'commission_bps' => 1000,
        'platform_fee_cents' => 400,
        'creator_earnings_cents' => 3600,
        'status' => 'verifying',
        'payment_gateway' => 'verify_et',
    ]);

    $exit = Artisan::call('billing:audit-verify-et-retirement', ['--json' => true]);
    $json = Artisan::output();
    $report = json_decode($json, true, 512, JSON_THROW_ON_ERROR);

    expect($exit)->toBe(1)
        ->and($report['candidate_for_manual_signoff'])->toBeFalse()
        ->and($report['blockers']['unsettled_storefront_orders'])->toBeGreaterThanOrEqual(1)
        ->and($order->fresh()->status)->toBe('verifying')
        ->and($json)->not->toContain($order->uuid)
        ->and($json)->not->toContain('synthetic-buyer@example.test');
});
