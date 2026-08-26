<?php

namespace App\Storefront\Controllers;

use App\Storefront\Models\DownloadEntitlement;
use App\Storefront\Models\DigitalProductOrderRecoveryDelivery;
use App\Storefront\Models\ProductReview;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\OrderRecoveryService;
use App\Storefront\Jobs\SendStorefrontReviewNotification;
use App\Storefront\Jobs\SendStorefrontReceipt;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;

class CustomerOrderPortalController extends Controller
{
    public function requestCode(Request $request): array
    {
        app(OrderRecoveryService::class)->request(
            (string) $request->input('email', ''),
            (string) $request->ip(),
        );

        return [
            'message' => __('If paid purchases match that email address, we will send a sign-in code shortly.'),
        ];
    }

    public function verifyCode(Request $request)
    {
        $result = app(OrderRecoveryService::class)->verifyCode(
            (string) $request->input('email', ''),
            (string) $request->input('code', ''),
        );

        abort_unless($result, 422, __('That sign-in code is invalid or has expired.'));

        [$recovery, $sessionToken] = $result;
        $secure = $request->isSecure() || app()->environment('production');

        return response()->json(['message' => __('You are signed in.')])->withCookie(cookie(
            OrderRecoveryService::COOKIE,
            "{$recovery->uuid}.{$sessionToken}",
            60 * 24 * 30,
            '/',
            null,
            $secure,
            true,
            false,
            'lax',
        ));
    }

    public function purchases(Request $request): array
    {
        $orders = app(OrderRecoveryService::class)->paidOrders($this->recovery($request))->get();

        return [
            'orders' => $orders->map(fn (StorefrontOrder $order) => $this->orderData($order))->values(),
        ];
    }

    public function download(Request $request, string $order, DownloadEntitlement $entitlement): array
    {
        $storefrontOrder = app(OrderRecoveryService::class)->paidOrders($this->recovery($request))
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
        $key = "customer-order-portal:receipt:{$recovery->id}:{$storefrontOrder->id}";

        abort_if(RateLimiter::tooManyAttempts($key, 1), 429, __('Please wait before requesting another receipt.'));
        RateLimiter::hit($key, 600);

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

    public function review(Request $request, string $order)
    {
        abort_unless(settings('storefront.reviews_enabled', false), 404);
        $data = $request->validate([
            'stars' => ['required', 'integer', 'min:1', 'max:5'],
            'title' => ['nullable', 'string', 'max:120'],
            'review' => ['nullable', 'string', 'max:5000'],
        ]);
        $storefrontOrder = app(OrderRecoveryService::class)->paidOrders($this->recovery($request))
            ->where('uuid', $order)
            ->firstOrFail();
        $created = false;

        $review = DB::transaction(function () use ($storefrontOrder, $data, &$created) {
            $existing = ProductReview::query()->where('storefront_order_id', $storefrontOrder->id)->first();

            if ($existing) {
                $existing->update([
                    'review' => $data['review'] ?: null,
                    'title' => $data['title'] ?? null,
                    'recommend' => $data['stars'] >= 4,
                    'approved' => $existing->hidden_at === null,
                ]);
                $existing->ratings()->where('key', 'overall')->first()?->update(['value' => $data['stars']]);

                return $existing;
            }

            $created = true;
            $review = $storefrontOrder->product->addReview([
                'review' => $data['review'] ?: null,
                'recommend' => $data['stars'] >= 4,
                'approved' => true,
                'ratings' => ['overall' => $data['stars']],
            ]);
            $review->forceFill([
                'storefront_order_id' => $storefrontOrder->id,
                'buyer_email' => $storefrontOrder->buyer_email,
                'buyer_name' => $storefrontOrder->buyer_name,
                'title' => $data['title'] ?? null,
            ])->save();

            return $review;
        });

        if ($created) {
            SendStorefrontReviewNotification::dispatch($review->id)->afterCommit();
        }

        return ['review' => [
            'stars' => $data['stars'],
            'title' => $review->title,
            'review' => $review->review,
        ]];
    }

    private function recovery(Request $request)
    {
        $recovery = app(OrderRecoveryService::class)->current($request);
        abort_unless($recovery, 403, __('Your portal session has expired. Request a new code to continue.'));

        return $recovery;
    }

    private function orderData(StorefrontOrder $order): array
    {
        return [
            'id' => $order->uuid,
            'product_title' => $order->product?->title,
            'product_cover' => $order->product?->cover?->url,
            'currency' => $order->currency,
            'gross_amount_cents' => $order->gross_amount_cents,
            'paid_at' => $order->paid_at?->toIso8601String(),
            'receipt_sent_at' => $order->receipt_sent_at?->toIso8601String(),
            'review' => $order->review ? [
                'stars' => $order->review->ratings->firstWhere('key', 'overall')?->value,
                'title' => $order->review->title,
                'review' => $order->review->review,
            ] : null,
            'downloads' => $order->entitlements
                ->map(fn (DownloadEntitlement $entitlement) => [
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
