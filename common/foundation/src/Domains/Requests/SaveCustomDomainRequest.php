<?php

namespace Common\Domains\Requests;

use Common\Domains\Validation\HostIsNotBlacklisted;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveCustomDomainRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'host' => [
                Rule::requiredIf(!$this->getDomainId()),
                'string',
                'max:100',
                Rule::unique('custom_domains')
                    ->where('workspace_id', ActiveWorkspace::get()->id)
                    ->ignore($this->getDomainId()),
                new HostIsNotBlacklisted(),
            ],
            'global' => 'boolean',
        ];
    }

    protected function getDomainId(): ?string
    {
        return $this->route('id') ?? $this->input('domain_id');
    }
}
