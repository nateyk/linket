<?php

namespace Common\Billing\Subscriptions;

use Common\Billing\Models\Price;
use Common\Billing\Models\Product;
use Common\Billing\Subscription;
use Common\Core\Demo\BlockedOnDemoSite;
use Common\Users\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;

/**
 * @tags Subscriptions, Admin
 */
class SubscriptionsController extends Controller
{
    /**
     * List all subscriptions.
     *
     * @operationId listSubscriptions
     */
    public function index(Request $request)
    {
        Gate::authorize('index', Subscription::class);

        $data = $request->validate([
            'query' => 'nullable|string',
            'per_page' => 'integer|min:1|max:100',
            'page' => 'integer|min:1',
            'sort' => 'string',
            'user_id' => 'integer',
            'product_id' => 'integer',
            'price_id' => 'integer',
            'gateway_name' => 'string',
            'ends_at' => 'string',
            'renews_at' => 'string',
            'created_at' => 'string',
            'updated_at' => 'string',
        ]);

        $pagination = (new SubscriptionsQueryBuilder($data))->paginate();

        return SubscriptionResource::collection($pagination);
    }

    /**
     * Create a subscription.
     *
     * @operationId createSubscription
     */
    #[BlockedOnDemoSite]
    public function store(CrupdateSubscriptionRequest $request)
    {
        Gate::authorize('store', Subscription::class);

        $subscription = Subscription::create($request->validated());

        return (new SubscriptionResource($subscription))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Update a subscription.
     *
     * @operationId updateSubscription
     */
    #[BlockedOnDemoSite]
    public function update(int $id, CrupdateSubscriptionRequest $request)
    {
        $subscription = Subscription::findOrFail($id);

        Gate::authorize('show', $subscription);

        $subscription->fill($request->validated())->save();

        return new SubscriptionResource($subscription);
    }

    /**
     * Change subscription plan.
     *
     * @operationId changeSubscriptionPlan
     */
    #[BlockedOnDemoSite]
    public function changePlan(int $id, Request $request)
    {
        $subscription = Subscription::findOrFail($id);

        Gate::authorize('show', $subscription);

        $data = $request->validate([
            'newProductId' => 'required|integer|exists:products,id',
            'newPriceId' => 'required|integer|exists:prices,id',
        ]);

        $newProduct = Product::findOrFail($data['newProductId']);
        $newPrice = Price::findOrFail($data['newPriceId']);

        $subscription->changePlan($newProduct, $newPrice);

        $user = $subscription->user()->first();

        return new UserResource($user->load('subscriptions.product'));
    }

    /**
     * Cancel a subscription.
     *
     * @operationId cancelSubscription
     */
    #[BlockedOnDemoSite]
    public function cancel(int $id, Request $request)
    {
        $subscription = Subscription::findOrFail($id);

        Gate::authorize('show', $subscription);

        $request->validate([
            'deleteSubscription' => 'boolean',
        ]);

        if ($request->boolean('deleteSubscription')) {
            $subscription->cancelAndDelete();
        } else {
            $subscription->cancel();
        }

        return response()->noContent();
    }

    /**
     * Resume a subscription.
     *
     * @operationId resumeSubscription
     */
    #[BlockedOnDemoSite]
    public function resume(int $id)
    {
        $subscription = Subscription::findOrFail($id);

        Gate::authorize('show', $subscription);

        $subscription->resume();

        return new SubscriptionResource($subscription);
    }
}
