<?php

namespace Common\Billing\Subscriptions;

use Carbon\Carbon;
use Common\Billing\Models\Price;
use Common\Billing\Models\Product;
use Common\Billing\Subscription;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Collection;

class SubscriptionFactory extends Factory
{
    protected $model = Subscription::class;

    protected static null|Collection $products = null;
    protected static null|Collection $prices = null;

    public function definition()
    {
        if (is_null(self::$products)) {
            self::$products = Product::query()->get();
            self::$prices = Price::query()->get();
        }

        $product = self::$products->isNotEmpty() ? self::$products->random() : null;
        $productPrices = $product
            ? self::$prices->where('product_id', $product->id)
            : null;
        $price = $productPrices && $productPrices->isNotEmpty()
            ? $productPrices->random()
            : null;

        return [
            'price_id' => $price?->id ?? 0,
            'product_id' => $product?->id ?? 0,
            'gateway_name' => 'none',
        ];
    }

    public function active(): self
    {
        return $this->state(function (array $attributes) {
            return [
                'gateway_status' => 'active',
                'renews_at' => Carbon::now()->addDays(random_int(10, 30)),
            ];
        });
    }

    public function incomplete(): self
    {
        return $this->state(function (array $attributes) {
            return [
                'gateway_status' => 'incomplete',
                'ends_at' => Carbon::now()->addDays(random_int(10, 30)),
            ];
        });
    }

    public function trialing(): self
    {
        return $this->state(function (array $attributes) {
            return [
                'gateway_status' => 'trialing',
                'trial_ends_at' => Carbon::now()->addDays(random_int(10, 30)),
            ];
        });
    }
}
