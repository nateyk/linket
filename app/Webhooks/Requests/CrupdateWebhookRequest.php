<?php

namespace App\Webhooks\Requests;

use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

#[SchemaName('CrupdateWebhookBody')]
class CrupdateWebhookRequest extends FormRequest
{
    protected function isCreating(): bool
    {
        return $this->getMethod() === 'POST';
    }

    public function rules(): array
    {
        return [
            'name' => [
                Rule::requiredIf($this->isCreating()),
                'string',
                'max:100',
                Rule::unique('webhooks')
                    ->where('user_id', Auth::id())
                    ->ignore($this->route('id')),
            ],
            'url' => [Rule::requiredIf($this->isCreating()), 'url', 'max:2048'],
            'signing_secret' => [
                Rule::requiredIf($this->isCreating()),
                'string',
                'max:64',
            ],
            'selected_events' => [
                Rule::requiredIf($this->isCreating()),
                'array',
                'min:1',
            ],
            'selected_events.*' => 'string',
        ];
    }
}
