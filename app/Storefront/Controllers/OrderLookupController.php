<?php

namespace App\Storefront\Controllers;

use App\Storefront\Jobs\SendStorefrontReceipt;
use App\Storefront\Models\StorefrontOrder;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\URL;

class OrderLookupController extends Controller
{
    public function lookup(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email:rfc', 'max:254'],
            'reference' => ['required', 'string', 'max:120'],
        ]);

        $query = StorefrontOrder::query()
            ->where('buyer_email', $data['email'])
            ->where('status', 'paid')
            ->with(['product', 'entitlements.file']);

        $query->where(function ($q) use ($data) {
            $ref = $data['reference'];
            $q->where('uuid', $ref)
                ->orWhere('chapa_tx_ref', $ref)
                ->orWhere('stripe_checkout_session_id', $ref);
        });

        $orders = $query->latest('paid_at')->take(1)->get();

        return response()->json([
            'orders' => $orders->map(fn(StorefrontOrder $order) => [
                'id' => $order->uuid,
                'product_title' => $order->product?->title,
                'currency' => $order->currency,
                'gross_amount_cents' => $order->gross_amount_cents,
                'paid_at' => $order->paid_at?->toIso8601String(),
                'receipt_sent_at' => $order->receipt_sent_at?->toIso8601String(),
                'downloads' => $order->entitlements
                    ->filter(fn($e) => $e->file && $e->expires_at && $e->download_count < $e->download_limit && !$e->expires_at->isPast())
                    ->map(fn($entitlement) => [
                        'name' => $entitlement->file->getNameWithExtension(),
                        'remaining_downloads' => max(0, $entitlement->download_limit - $entitlement->download_count),
                        'expires_at' => $entitlement->expires_at?->toIso8601String(),
                        'url' => URL::temporarySignedRoute(
                            'storefront.download',
                            $entitlement->expires_at,
                            ['token' => $entitlement->token],
                        ),
                    ])
                    ->values(),
            ]),
        ]);
    }

    public function resendReceipt(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email:rfc', 'max:254'],
            'order_id' => ['required', 'string', 'max:120'],
        ]);

        $order = StorefrontOrder::query()
            ->where('buyer_email', $data['email'])
            ->where('status', 'paid')
            ->where(function ($q) use ($data) {
                $q->where('uuid', $data['order_id'])
                    ->orWhere('chapa_tx_ref', $data['order_id'])
                    ->orWhere('stripe_checkout_session_id', $data['order_id']);
            })
            ->first();

        abort_unless($order, 404, __('No matching paid order found for that email and order reference.'));

        SendStorefrontReceipt::dispatch($order->id, true)->onQueue('mail');

        return response()->json([
            'message' => __('A receipt is being sent to :email.', ['email' => $order->buyer_email]),
        ]);
    }
}
