<?php

namespace App\Storefront;

use App\Storefront\Models\DownloadEntitlement;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Jobs\SendStorefrontReceipt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class StorefrontWebhookHandler
{
    public function handleCheckoutCompleted(array $session): void
    {
        $uuid = data_get($session, 'metadata.storefront_order_id') ?? data_get($session, 'client_reference_id');
        if (!$uuid || data_get($session, 'payment_status') !== 'paid') return;

        DB::transaction(function () use ($uuid, $session): void {
            $order = StorefrontOrder::query()->where('uuid', $uuid)->lockForUpdate()->first();
            if (!$order || $order->status === 'paid' || $order->monetization_policy !== null) return;
            $this->fulfill(
                $order,
                data_get($session, 'customer_details.email') ?? data_get($session, 'customer_email'),
                [
                    'stripe_checkout_session_id' => data_get($session, 'id'),
                    'stripe_payment_intent_id' => data_get($session, 'payment_intent'),
                ],
            );
        });
    }

    public function fulfill(StorefrontOrder $order, ?string $buyerEmail = null, array $gatewayAttributes = []): void
    {
        DB::transaction(function () use ($order, $buyerEmail, $gatewayAttributes): void {
            $locked = StorefrontOrder::query()->whereKey($order->getKey())->lockForUpdate()->firstOrFail();
            if ($locked->status === 'paid') return;

            $locked->update([
                'status' => 'paid',
                'buyer_email' => $buyerEmail ?? $locked->buyer_email,
                'paid_at' => now(),
                ...$gatewayAttributes,
            ]);
            $order = $locked;
        $fresh = $order->fresh('product');
        Log::info('store.order.fulfilled', [
            'store_id' => $order->store_id ?? $order->biolink_id,
            'workspace_id' => $fresh?->product?->workspace_id ?? $order->product?->workspace_id ?? null,
            'order_id' => $order->id,
            'product_id' => $order->digital_product_id,
        ]);
        app(DigitalProductFinance::class)->creditOrder($fresh ?? $order->fresh('product'));
        $order->loadMissing('product.files');
        foreach ($order->product->files as $file) {
            DownloadEntitlement::firstOrCreate([
                'storefront_order_id' => $order->id,
                'file_entry_id' => $file->id,
            ], [
                'token' => (string) Str::uuid(),
                'download_limit' => config('storefront.download_limit'),
                'expires_at' => now()->addDays(config('storefront.download_days')),
            ]);
        }
        // Course enrollment (idempotent)
        try {
            $productForCourse = $order->product ?? $fresh?->product;
            if ($productForCourse && ($productForCourse->type ?? 'digital') === 'course' && $productForCourse->course) {
                app(\App\Courses\Services\EnrollmentService::class)->grantFromOrder($order->fresh('product.course'));
            }
        } catch (\Throwable $e) {
            Log::warning('store.course.enrollment_failed', ['order_id' => $order->id, 'error' => $e->getMessage()]);
        }
        SendStorefrontReceipt::dispatch($order->id)->afterCommit();
        });
    }
}
