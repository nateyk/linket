<?php

namespace Common\Billing\Products;

use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

#[SchemaName('CrupdateProductBody')]
class CrupdateProductRequest extends FormRequest
{
    protected function isCreating(): bool
    {
        return $this->getMethod() === 'POST';
    }

    public function rules(): array
    {
        return [
            'name' => [
                Rule::when($this->isCreating(), 'required'),
                'string',
                'max:250',
            ],
            'description' => 'nullable|string|max:200',

            'permissions' => 'array',
            'permissions.*.id' => 'integer',
            'permissions.*.restrictions' => 'array',
            'permissions.*.restrictions.*.name' => 'string',
            'permissions.*.restrictions.*.value' => '',

            'recommended' => 'boolean',
            'position' => 'integer',
            'hidden' => 'boolean',
            'free' => 'boolean',
            'active' => 'boolean',
            'feature_list' => 'array',
            'is_default' => 'boolean',
            'storefront_benefits' => 'nullable|array',
            'storefront_benefits.platform_fee_percent' => 'nullable|numeric|min:0|max:100',
            'storefront_benefits.commission_bps' => 'nullable|integer|min:0|max:10000',
            'storefront_benefits.max_products' => 'nullable|integer|min:0',
            'storefront_benefits.max_free_products' => 'nullable|integer|min:0',
            'storefront_benefits.max_paid_products' => 'nullable|integer|min:0',
            'storefront_benefits.max_upload_bytes' => 'nullable|integer|min:0',
            'storefront_benefits.max_storefronts' => 'nullable|integer|min:0',
            'storefront_benefits.max_workspaces' => 'nullable|integer|min:0',
            'storefront_benefits.tracking_pixels_enabled' => 'nullable|boolean',
            'storefront_benefits.advanced_analytics_enabled' => 'nullable|boolean',
            'trial_period_days' => 'integer|min:0|max:14',
            'prices' => [
                'array',
                Rule::requiredIf(
                    $this->isCreating() && !$this->boolean('free'),
                ),
            ],
            'prices.*.id' => 'integer',
            'prices.*.currency' => [
                Rule::when($this->isCreating(), 'required'),
                Rule::when($this->isCreating(), 'in:etb,ETB'),
                'string',
                'max:50',
            ],
            'prices.*.interval' => 'string|max:50',
            'prices.*.interval_count' => 'integer',
            'prices.*.amount' => 'min:1|numeric',
        ];
    }
}
