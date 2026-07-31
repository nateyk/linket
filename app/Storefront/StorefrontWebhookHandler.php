<?php

namespace App\Storefront;

use App\Storefront\Models\DownloadEntitlement;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Jobs\SendStorefrontReceipt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class StorefrontWebhookHandler
{
    public function handleCheckoutCompleted(array $session): void
    {
        $uuid = data_get($session, 'metadata.storefront_order_id') ?? data_get($session, 'client_reference_id');
        if (!$uuid || data_get($session, 'payment_status') !== 'paid') return;

        DB::transaction(function () use ($uuid, $session): void {
            $order = StorefrontOrder::query()->where('uuid', $uuid)->lockForUpdate()->first();
            if (!$order || $order->status === 'paid') return;
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
        if ($order->status === 'paid') return;

        $order->update([
            'status' => 'paid',
            'buyer_email' => $buyerEmail ?? $order->buyer_email,
            'paid_at' => now(),
            ...$gatewayAttributes,
        ]);
        app(DigitalProductFinance::class)->creditOrder($order->fresh('product'));
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
        SendStorefrontReceipt::dispatch($order->id)->afterCommit();
    }
}
