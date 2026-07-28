<?php

namespace Common\Billing\Subscriptions;

use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

#[SchemaName('CrupdateSubscriptionBody')]
class CrupdateSubscriptionRequest extends FormRequest
{
    protected function isCreating(): bool
    {
        return $this->getMethod() === 'POST';
    }

    public function rules(): array
    {
        return [
            'user_id' => [
                'required',
                'exists:users,id',
                Rule::unique('subscriptions')
                    ->when(
                        !$this->isCreating(),
                        fn($rule) => $rule->ignore($this->route('id')),
                    ),
            ],
            'renews_at' => [
                Rule::when($this->isCreating(), 'required_without:ends_at'),
                'date',
                'nullable',
            ],
            'ends_at' => [
                Rule::when($this->isCreating(), 'required_without:renews_at'),
                'date',
                'nullable',
            ],
            'product_id' => 'required|integer|exists:products,id',
            'price_id' => 'required|integer|exists:prices,id',
            'description' => 'string|nullable',
        ];
    }
}
