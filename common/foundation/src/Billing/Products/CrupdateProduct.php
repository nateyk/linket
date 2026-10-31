<?php

namespace Common\Billing\Products;

use Common\Permissions\Traits\SyncsPermissions;
use Common\Billing\Gateways\Actions\SyncProductOnEnabledGateways;
use Common\Billing\Models\Price;
use Common\Billing\Models\Product;
use App\Payments\Models\PlanChangeAudit;
use App\Payments\Models\ProSubscriptionPayment;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CrupdateProduct
{
    use SyncsPermissions;

    public function execute(
        array $data,
        Product|null $originalProduct = null,
        $syncProduct = true,
    ): Product {
        return DB::transaction(function () use (
            $data,
            $originalProduct,
            $syncProduct,
        ): Product {
            $product =
                $originalProduct?->load('prices') ?:
                app(Product::class)->newModelInstance([
                    'uuid' => Str::uuid(),
                ]);
            $before = $originalProduct ? $this->auditSnapshot($originalProduct) : null;
            $systemKey = $originalProduct?->system_key;

            if ($systemKey === 'free') {
                abort_if(array_key_exists('free', $data) && !$data['free'], 422, __('The Free tier must remain a free plan.'));
                abort_if(array_key_exists('is_default', $data) && !$data['is_default'], 422, __('The Free tier must remain the default plan.'));
            }
            if ($systemKey === 'pro') {
                abort_if(array_key_exists('free', $data) && $data['free'], 422, __('The Pro plan must remain a paid plan.'));
            }

            if (!$originalProduct && !Product::query()->where('system_key', 'free')->exists() && ($data['free'] ?? false)) {
                $systemKey = 'free';
            }
            if (!$originalProduct && !Product::query()->where('system_key', 'pro')->exists() && ($data['name'] ?? null) === 'Pro') {
                $systemKey = 'pro';
            }

            $benefits = array_replace(
                is_array($originalProduct?->storefront_benefits) ? $originalProduct->storefront_benefits : [],
                is_array($data['storefront_benefits'] ?? null) ? $data['storefront_benefits'] : [],
            );
            if ($systemKey === 'free' || $systemKey === 'pro') {
                $benefits['commission_bps'] = 0;
                $benefits['platform_fee_percent'] = 0;
            }
            if ($systemKey === 'free') {
                $benefits['free_verified_sales'] ??= (int) config('storefront.free_verified_sales_default', 10);
            }
            if ($systemKey === 'pro') {
                $benefits['free_verified_sales'] = 0;
            }

            $newData = [
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'hidden' => $data['hidden'] ?? false,
                'free' => $systemKey === 'free' ? true : ($systemKey === 'pro' ? false : ($data['free'] ?? false)),
                'active' => $data['active'] ?? $originalProduct?->active ?? true,
                'is_default' => $systemKey === 'free' ? true : ($data['is_default'] ?? $originalProduct?->is_default ?? false),
                'recommended' => $data['recommended'] ?? false,
                'trial_period_days' => $data['trial_period_days'] ?? 0,
                'position' => $data['position'] ?? 0,
                'feature_list' => $data['feature_list'] ?? [],
                'storefront_benefits' => $benefits ?: null,
            ];

            $isDefault =
                $newData['is_default'] || ($originalProduct?->is_default ?? false);
            abort_if(
                $isDefault && !$newData['active'],
                422,
                __('The default plan cannot be disabled.'),
            );

            $product = $product->fill($newData);
            $product->system_key = $systemKey;
            $product->save();

            if (!empty($newData['is_default'])) {
                Product::where('id', '!=', $product->id)->update([
                    'is_default' => false,
                ]);
            }

        if (
            array_key_exists('permissions', $data) &&
            is_array($data['permissions'])
        ) {
            $this->syncPermissions($product, $data['permissions']);
        }

        $prices = Arr::get($data, 'prices') ?? [];
        $versionedProPriceId = null;

        if (array_key_exists('prices', $data)) {
            $originalProduct?->prices->each(function (Price $price) use ($prices): void {
                if (Arr::first($prices, fn ($payload) => isset($payload['id']) && (int) $payload['id'] === (int) $price->id)) {
                    return;
                }

                $hasSubscriptions = $price->subscriptions()->exists();
                $hasPendingPayments = ProSubscriptionPayment::query()->where('price_id', $price->id)->where('status', 'pending_payment')->exists();
                if (!$hasSubscriptions && !$hasPendingPayments) {
                    $price->delete();
                }
            });
        }

        // update existing prices and create new ones
        foreach ($prices as $price) {
            $isExistingPrice = isset($price['id']);
            $pricePayload = [
                'amount' => $price['amount'],
                'interval_count' => $price['interval_count'],
                'interval' => $price['interval'],
                'currency' => $price['currency'],
            ];

            if ($isExistingPrice) {
                $currentPrice = Price::query()->where('product_id', $product->id)->findOrFail($price['id']);
                $hasSubscriptions = $currentPrice->subscriptions()->exists();
                $hasPendingPayments = ProSubscriptionPayment::query()->where('price_id', $currentPrice->id)->where('status', 'pending_payment')->exists();
                $changed = (float) $currentPrice->amount !== (float) $pricePayload['amount']
                    || strtoupper((string) $currentPrice->currency) !== strtoupper($pricePayload['currency'])
                    || $currentPrice->interval !== $pricePayload['interval']
                    || (int) $currentPrice->interval_count !== (int) $pricePayload['interval_count'];

                if ($changed && ($hasSubscriptions || $hasPendingPayments)) {
                    $wasDefault = (bool) $currentPrice->default;
                    if ($wasDefault) {
                        $product->prices()->update(['default' => false]);
                    }
                    $newPrice = $product->prices()->create([...$pricePayload, 'default' => $wasDefault]);
                    if ($systemKey === 'pro' && strtoupper($pricePayload['currency']) === 'ETB'
                        && $pricePayload['interval'] === 'month' && (int) $pricePayload['interval_count'] === 1) {
                        $versionedProPriceId = $newPrice->id;
                    }
                } else {
                    $currentPrice->update($pricePayload);
                }
            } else {
                $hasDefault = $product->prices()->where('default', true)->exists();
                $product->prices()->create([...$pricePayload, 'default' => !$hasDefault]);
            }
        }

        if ($systemKey === 'pro') {
            abort_unless(
                $product->prices()->where('currency', 'ETB')->where('interval', 'month')->where('interval_count', 1)->exists(),
                422,
                __('Pro requires an ETB monthly price.'),
            );
            $proPrice = $versionedProPriceId
                ? $product->prices()->find($versionedProPriceId)
                : $product->prices()->where('currency', 'ETB')->where('interval', 'month')->where('interval_count', 1)
                    ->orderByDesc('default')->orderByDesc('id')->first();
            if ($proPrice) {
                $product->prices()->where('id', '!=', $proPrice->id)->update(['default' => false]);
                $proPrice->update(['default' => true]);
            }
        }

        if (!$product->free && $syncProduct) {
            app(SyncProductOnEnabledGateways::class)->execute($product);
        }

        $after = $this->auditSnapshot($product->fresh('prices'));
        if ($before !== $after) {
            PlanChangeAudit::query()->create([
                'product_id' => $product->id,
                'product_name' => $product->name,
                'actor_id' => request()->user()?->id,
                'change_type' => $before === null ? 'created' : 'updated',
                'before' => $before,
                'after' => $after,
            ]);
        }

        return $product;
        });
    }

    /** @return array<string, mixed> */
    private function auditSnapshot(Product $product): array
    {
        return [
            'name' => $product->name,
            'description' => $product->description,
            'free' => (bool) $product->free,
            'active' => (bool) $product->active,
            'hidden' => (bool) $product->hidden,
            'is_default' => (bool) $product->is_default,
            'recommended' => (bool) $product->recommended,
            'position' => (int) $product->position,
            'feature_list' => $product->feature_list ?? [],
            'storefront_benefits' => $product->storefront_benefits ?? [],
            'prices' => $product->prices->map(fn (Price $price): array => [
                'id' => $price->id,
                'amount' => (string) $price->getRawOriginal('amount'),
                'currency' => $price->currency,
                'interval' => $price->interval,
                'interval_count' => $price->interval_count,
                'default' => (bool) $price->default,
            ])->all(),
        ];
    }
}
