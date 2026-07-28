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
            'feature_list' => 'array',
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
                'string',
                'max:50',
            ],
            'prices.*.interval' => 'string|max:50',
            'prices.*.interval_count' => 'integer',
            'prices.*.amount' => 'min:1|numeric',
        ];
    }
}
