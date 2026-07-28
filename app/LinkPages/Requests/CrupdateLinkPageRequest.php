<?php

namespace App\LinkPages\Requests;

use Common\Workspaces\ActiveWorkspace;
use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

#[SchemaName('CrupdateLinkPageBody')]
class CrupdateLinkPageRequest extends FormRequest
{
    protected function isCreating(): bool
    {
        return $this->getMethod() === 'POST';
    }

    public function rules(): array
    {
        return [
            'title' => [
                Rule::when($this->isCreating(), 'required'),
                'string',
                'min:3',
                'max:100',
                Rule::unique('link_pages')
                    ->where('workspace_id', ActiveWorkspace::get()->id)
                    ->ignore($this->route('id')),
            ],
            'body' => [
                Rule::when($this->isCreating(), 'required'),
                'string',
                'min:3',
            ],
            'hide_footer' => 'nullable|boolean',
            'hide_navbar' => 'nullable|boolean',
        ];
    }
}
