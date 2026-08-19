<?php

namespace App\Storefront\Controllers;

use App\Storefront\Jobs\SendStorefrontReceipt;
use App\Storefront\Models\DigitalProductOrderRecoveryDelivery;
use App\Storefront\Models\DownloadEntitlement;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\OrderRecoveryService;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;

class OrderLookupController extends Controller
{
    public function requestRecovery(Request $request): array
    {
        $email = (string) $request->input('email', '');
        app(OrderRecoveryService::class)->request($email, (string) $request->ip());

        return [
            'message' => __('If paid purchases match that email address, we will send a secure recovery link shortly.'),
        ];
    }

    public function redeem(string $token)
    {
        $result = app(OrderRecoveryService::class)->redeem($token);

        if (!$result) {
            return redirect('/find-my-purchase?expired=1');
        }

        [$recovery, $sessionToken] = $result;
        $secure = request()->isSecure() || app()->environment('production');

        return redirect('/find-my-purchase/orders')->withCookie(cookie(
            OrderRecoveryService::COOKIE,
            "{$recovery->uuid}.{$sessionToken}",
            30,
            '/',
            null,
            $secure,
            true,
            false,
            'lax',
        ));
    }

    public function orders(Request $request): array
    {
        $recovery = $this->recovery($request);
        $orders = app(OrderRecoveryService::class)->paidOrders($recovery)->get();

        return [
            'orders' => $orders->map(fn(StorefrontOrder $order) => $this->orderData($order))->values(),
        ];
    }

    public function download(Request $request, string $order, DownloadEntitlement $entitlement): array
    {
        $recovery = $this->recovery($request);
        $storefrontOrder = app(OrderRecoveryService::class)->paidOrders($recovery)
            ->where('uuid', $order)
            ->firstOrFail();

        abort_unless($entitlement->storefront_order_id === $storefrontOrder->id, 404);
        abort_if($entitlement->revoked_at || $entitlement->expires_at->isPast(), 410, __('This protected download is no longer available.'));
        abort_if($entitlement->download_count >= $entitlement->download_limit, 410, __('This protected download has reached its limit.'));

        return [
            'url' => URL::temporarySignedRoute('storefront.download', $entitlement->expires_at, ['token' => $entitlement->token]),
        ];
    }

    public function resendReceipt(Request $request, string $order): array
    {
        $recovery = $this->recovery($request);
        $storefrontOrder = app(OrderRecoveryService::class)->paidOrders($recovery)
            ->where('uuid', $order)
            ->firstOrFail();
        $key = "digital-product-recovery:receipt:{$recovery->id}:{$storefrontOrder->id}";

        abort_if(RateLimiter::tooManyAttempts($key, 1), 429, __('Please wait before requesting another receipt.'));
        RateLimiter::hit($key, 600);

        DigitalProductOrderRecoveryDelivery::create([
            'digital_product_order_recovery_id' => $recovery->id,
            'storefront_order_id' => $storefrontOrder->id,
            'email_hash' => $recovery->email_hash,
            'masked_email' => app(OrderRecoveryService::class)->maskEmail($recovery->email),
            'event' => 'receipt_resend_requested',
            'status' => 'accepted',
        ]);
        $delivery = DigitalProductOrderRecoveryDelivery::create([
            'digital_product_order_recovery_id' => $recovery->id,
            'storefront_order_id' => $storefrontOrder->id,
            'email_hash' => $recovery->email_hash,
            'masked_email' => app(OrderRecoveryService::class)->maskEmail($recovery->email),
            'event' => 'receipt_email',
            'status' => 'queued',
        ]);

        SendStorefrontReceipt::dispatch($storefrontOrder->id, true, $delivery->id)->onQueue('mail');

        return ['message' => __('Your receipt is being sent.')];
    }

    private function recovery(Request $request)
    {
        $recovery = app(OrderRecoveryService::class)->current($request);
        abort_unless($recovery, 403, __('Your purchase recovery session has expired. Request a new link to continue.'));

        return $recovery;
    }

    private function orderData(StorefrontOrder $order): array
    {
        return [
            'id' => $order->uuid,
            'product_title' => $order->product?->title,
            'currency' => $order->currency,
            'gross_amount_cents' => $order->gross_amount_cents,
            'paid_at' => $order->paid_at?->toIso8601String(),
            'receipt_sent_at' => $order->receipt_sent_at?->toIso8601String(),
            'downloads' => $order->entitlements
                ->map(fn(DownloadEntitlement $entitlement) => [
                    'id' => $entitlement->id,
                    'name' => $entitlement->file?->getNameWithExtension(),
                    'remaining_downloads' => max(0, $entitlement->download_limit - $entitlement->download_count),
                    'expires_at' => $entitlement->expires_at?->toIso8601String(),
                    'available' => (bool) ($entitlement->file && !$entitlement->revoked_at && !$entitlement->expires_at?->isPast() && $entitlement->download_count < $entitlement->download_limit),
                ])
                ->values(),
        ];
    }
}
