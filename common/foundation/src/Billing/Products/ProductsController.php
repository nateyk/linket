<?php

namespace Common\Billing\Products;

use Common\Billing\GatewayException;
use Common\Billing\Gateways\Actions\SyncProductOnEnabledGateways;
use Common\Billing\Gateways\Paypal\Paypal;
use Common\Billing\Gateways\Stripe\Stripe;
use Common\Billing\Models\Product;
use Common\Core\Demo\BlockedOnDemoSite;
use Exception;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Gate;

/**
 * @tags Subscriptions, Admin
 */
class ProductsController extends Controller
{
    public function __construct(
        protected Stripe $stripe,
        protected Paypal $paypal,
    ) {}

    /**
     * List all products.
     *
     * @operationId listProducts
     */
    public function index(Request $request)
    {
        Gate::authorize('index', Product::class);

        $data = $request->validate([
            'query' => 'nullable|string',
            'per_page' => 'integer|min:1|max:100',
            'page' => 'integer|min:1',
            'sort' => 'string',
            'fields_preset' => 'nullable|string',
            'created_at' => 'string',
            'updated_at' => 'string',
        ]);

        $pagination = (new ProductsQueryBuilder($data))->paginate();

        $response = ProductResource::collection($pagination);

        if (Arr::get($data, 'fields_preset') === 'pricing-page') {
            $faq = Arr::first(
                settings('landingPage.sections', []),
                fn($section) => $section['name'] === 'faq',
            );
            $response = $response->additional([
                'faq' => $faq,
            ]);
        }
        return $response;
    }

    /**
     * Retrieve a product.
     *
     * @operationId retrieveProduct
     */
    public function show(int $id)
    {
        $product = Product::findOrFail($id);

        Gate::authorize('show', $product);

        $product->loadMissing([
            'permissions',
            'prices' => fn(HasMany $builder) => $builder->withCount(
                'subscriptions',
            ),
        ]);

        return new ProductResource($product);
    }

    /**
     * Create a product.
     *
     * @operationId createProduct
     */
    #[BlockedOnDemoSite]
    public function store(CrupdateProductRequest $request)
    {
        Gate::authorize('store', Product::class);

        $product = (new CrupdateProduct())->execute($request->validated());

        return (new ProductResource($product))->response()->setStatusCode(201);
    }

    /**
     * Update a product.
     *
     * @operationId updateProduct
     */
    #[BlockedOnDemoSite]
    public function update(int $id, CrupdateProductRequest $request)
    {
        $product = Product::findOrFail($id);

        Gate::authorize('update', $product);

        $product = (new CrupdateProduct())->execute(
            $request->validated(),
            $product,
        );

        return new ProductResource($product);
    }

    /**
     * Delete a product.
     *
     * @operationId deleteProduct
     */
    #[BlockedOnDemoSite]
    public function destroy(int $id)
    {
        $product = Product::withCount('subscriptions')->findOrFail($id);

        Gate::authorize('destroy', $product);

        abort_if(
            $product->subscriptions->isNotEmpty(),
            422,
            __(
                "Could not delete ':product', because it has active subscriptions.",
                ['product' => $product->name],
            ),
        );

        try {
            if ($this->stripe->isEnabled()) {
                $this->stripe->deletePlan($product);
            }
            if ($this->paypal->isEnabled()) {
                $this->paypal->deletePlan($product);
            }
        } catch (Exception $e) {
            abort(422, $e->getMessage());
        }

        $product->delete();

        return response()->noContent();
    }

    /**
     * Sync all products to enabled payment gateways.
     *
     * @operationId syncProducts
     */
    #[BlockedOnDemoSite]
    public function syncProducts()
    {
        Gate::authorize('update', Product::class);

        $products = Product::where('free', false)->whereHas('prices')->get();

        foreach ($products as $product) {
            try {
                app(SyncProductOnEnabledGateways::class)->execute($product);
            } catch (GatewayException $e) {
                abort(
                    422,
                    "Could not sync \"$product->name\" product: {$e->getMessage()}",
                );
            }
        }

        return response()->noContent();
    }
}
