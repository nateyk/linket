<?php

namespace Common\Billing\Products;

use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

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
            'storefront_benefits.free_verified_sales' => 'sometimes|integer|min:0|max:100000',
            'storefront_benefits.platform_fee_percent' => 'nullable|numeric|min:0|max:100',
            'storefront_benefits.commission_bps' => 'nullable|integer|min:0|max:10000',
            'storefront_benefits.max_products' => 'nullable|integer|min:0',
            'storefront_benefits.max_free_products' => 'nullable|integer|min:0',
            'storefront_benefits.max_paid_products' => 'nullable|integer|min:0',
            'storefront_benefits.max_upload_bytes' => 'nullable|integer|min:0',
            'storefront_benefits.max_storefronts' => 'nullable|integer|min:0',
            'storefront_benefits.max_workspaces' => 'nullable|integer|min:0',
            'storefront_benefits.max_courses' => 'nullable|integer|min:0',
            'storefront_benefits.max_course_storage_bytes' => 'nullable|integer|min:0',
            'storefront_benefits.course_creation_enabled' => 'nullable|boolean',
            'storefront_benefits.course_video_upload_enabled' => 'nullable|boolean',
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
            'prices.*.interval_count' => 'integer|min:1|max:365',
            'prices.*.amount' => 'required|min:0.01|numeric',
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                if (!$this->boolean('free') && array_key_exists('prices', $this->all()) && count($this->input('prices', [])) === 0) {
                    $validator->errors()->add('prices', __('Paid plans must have at least one price.'));
                }
            },
        ];
    }
}
