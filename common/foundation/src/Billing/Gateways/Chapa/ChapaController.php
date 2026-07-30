<?php

namespace Common\Billing\Gateways\Chapa;

use App\Payments\ChapaGateway;
use App\Payments\Models\PaymentTransaction;
use Common\API\ExcludeRoutesFromPublicDocs;
use Common\Billing\Models\Price;
use Common\Billing\Models\Product;
use Common\Billing\Subscription;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

#[ExcludeRoutesFromPublicDocs]
class ChapaController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
    }

    /**
     * @operationId createChapaSubscriptionCheckout
     */
    public function checkout(Request $request)
    {
        $data = $request->validate([
            'product_id' => 'required|integer|exists:products,id',
            'price_id' => 'required|integer|exists:prices,id',
        ]);
        $product = Product::findOrFail($data['product_id']);
        $price = Price::query()
            ->where('id', $data['price_id'])
            ->where('product_id', $product->id)
            ->firstOrFail();
        abort_if($product->free, 422, 'Free plans do not require checkout.');
        abort_unless(strtolower((string) $price->currency) === 'etb', 422, 'Set an ETB price before accepting Chapa payments.');

        $subscription = Subscription::query()
            ->where('user_id', $request->user()->id)
            ->where('gateway_name', 'chapa')
            ->whereNull('ends_at')
            ->latest('id')
            ->first();

        if (!$subscription) {
            $subscription = Subscription::create([
                'user_id' => $request->user()->id,
                'product_id' => $product->id,
                'price_id' => $price->id,
                'gateway_name' => 'chapa',
                'gateway_status' => 'pending',
            ]);
        } elseif ($subscription->product_id !== $product->id || $subscription->price_id !== $price->id) {
            $subscription->update([
                'pending_product_id' => $product->id,
                'pending_price_id' => $price->id,
                'gateway_status' => 'pending',
            ]);
        }

        $effectivePrice = $subscription->pending_price_id
            ? Price::findOrFail($subscription->pending_price_id)
            : $price;
        $transaction = app(ChapaGateway::class)->createTransaction(
            $subscription,
            $subscription->renews_at ? 'subscription_renewal' : 'subscription_initial',
            number_format((float) $effectivePrice->amount, 2, '.', ''),
            url("checkout/{$product->id}/{$effectivePrice->id}/chapa/return?tx_ref={tx_ref}"),
            "{$product->name} subscription",
        );

        return response()->json([
            'checkout_url' => $transaction->checkout_url,
            'tx_ref' => $transaction->tx_ref,
        ]);
    }

    /**
     * @operationId getChapaPaymentStatus
     */
    public function status(Request $request, string $txRef)
    {
        $transaction = PaymentTransaction::query()
            ->where('tx_ref', $txRef)
            ->where('payable_type', Subscription::class)
            ->with('payable')
            ->firstOrFail();
        abort_unless($transaction->payable?->user_id === $request->user()->id, 403);

        return response()->json([
            'status' => $transaction->status,
            'subscription_id' => $transaction->payable_id,
        ]);
    }
}
