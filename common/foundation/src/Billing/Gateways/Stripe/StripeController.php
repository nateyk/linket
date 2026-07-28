<?php

namespace Common\Billing\Gateways\Stripe;

use Illuminate\Support\Facades\Auth;
use Common\Billing\Models\Product;
use Common\Billing\Gateways\Stripe\Stripe;
use Common\API\ExcludeRoutesFromPublicDocs;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

/**
 * @tags Stripe
 */
#[ExcludeRoutesFromPublicDocs]
class StripeController extends Controller
{
    public function __construct(protected Stripe $stripe)
    {
        $this->middleware('auth');
    }

    /**
     * Create a partial subscription.
     *
     * @operationId createPartialStripeSubscription
     */
    public function createPartialSubscription(Request $request)
    {
        $data = $request->validate([
            'product_id' => 'required|integer|exists:products,id',
            'price_id' => 'integer|exists:prices,id',
            'start_date' => 'string',
        ]);

        $product = Product::findOrFail($data['product_id']);
        $result = $this->stripe->subscriptions->createPartial(
            $product,
            Auth::user(),
            $data['price_id'],
        );

        return response()->json([
            'clientSecret' => $result['clientSecret'],
            'subscriptionId' => $result['subscriptionId'],
        ]);
    }

    /**
     * Create a setup intent.
     *
     * @operationId createStripeSetupIntent
     */
    public function createSetupIntent()
    {
        $clientSecret = $this->stripe->createSetupIntent(Auth::user());
        return response()->json(['clientSecret' => $clientSecret]);
    }

    /**
     * Change the default payment method.
     *
     * @operationId changeDefaultstripePaymentMethod
     */
    public function changeDefaultPaymentMethod(Request $request)
    {
        $data = $request->validate([
            'payment_method_id' => 'required|string',
        ]);

        $this->stripe->changeDefaultPaymentMethod(
            Auth::user(),
            $data['payment_method_id'],
        );

        return response()->noContent();
    }

    /**
     * Store subscription details locally.
     *
     * @operationId storeStripeSubscriptionDetailsLocally
     */
    public function storeSubscriptionDetailsLocally(Request $request)
    {
        $data = $request->validate([
            'intent_type' => 'required|string',
            'intent_id' => 'required|string',
            'subscription_id' => 'string',
        ]);

        if ($data['intent_type'] === 'paymentIntent') {
            $intent = $this->stripe->client->paymentIntents->retrieve(
                $data['intent_id'],
                ['expand' => ['invoice']],
            );
            $subscriptionId = $intent->invoice->subscription;
        } else {
            $intent = $this->stripe->client->setupIntents->retrieve(
                $data['intent_id'],
            );
            $subscriptionId = $this->stripe->client->subscriptions->retrieve(
                $data['subscription_id'],
            )->id;
        }

        $this->stripe->subscriptions->sync($subscriptionId);

        return response()->noContent();
    }
}
