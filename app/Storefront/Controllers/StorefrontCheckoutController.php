<?php

namespace App\Storefront\Controllers;

use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\StorefrontCheckout;
use Illuminate\Routing\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;

class StorefrontCheckoutController extends Controller
{
    public function show(DigitalProduct $digitalProduct)
    {
        abort_unless($digitalProduct->isApproved(), 404);
        return response()->json($digitalProduct->load('cover')->only(['id', 'title', 'description', 'price_cents', 'currency', 'cover']));
    }

    public function store(Request $request, DigitalProduct $digitalProduct)
    {
        if ($digitalProduct->isCourse()) {
            $digitalProduct->loadMissing('course');
            abort_unless($digitalProduct->isApproved() && $digitalProduct->course && $digitalProduct->course->published_at !== null, 404);
        } else {
            abort_unless($digitalProduct->isApproved() && $digitalProduct->files()->exists(), 404);
        }
        $buyer = $request->validate([
            'buyer_name' => ['required', 'string', 'min:2', 'max:120'],
            'buyer_email' => ['required', 'email:rfc', 'max:254'],
            'buyer_phone' => ['nullable', 'string', 'max:32'],
        ]);
        $order = app(StorefrontCheckout::class)->create($digitalProduct->load(['creator', 'files']), null, [
            'name' => $buyer['buyer_name'],
            'email' => $buyer['buyer_email'],
            'phone' => $buyer['buyer_phone'] ?? null,
        ]);
        return response()->json(['order_id' => $order->uuid, 'checkout_url' => $order->chapaCheckoutUrl]);
    }

    public function success(Request $request, string $order)
    {
        $order = StorefrontOrder::query()->where('uuid', $order)->with('entitlements.file')->firstOrFail();
        $paymentReference = $order->chapa_tx_ref
            ? $request->string('tx_ref')
            : $request->string('session_id');
        $expectedReference = $order->chapa_tx_ref ?: $order->stripe_checkout_session_id;
        abort_unless(hash_equals((string) $expectedReference, (string) $paymentReference), 403);
        return response()->json([
            'id' => $order->uuid,
            'status' => $order->status,
            'buyer_email' => $order->buyer_email,
            'downloads' => $order->entitlements->map(fn($entitlement) => [
                'name' => $entitlement->file->getNameWithExtension(),
                'expires_at' => $entitlement->expires_at,
                'url' => URL::temporarySignedRoute('storefront.download', $entitlement->expires_at, ['token' => $entitlement->token]),
            ]),
        ]);
    }
}
