<?php

namespace Common\Workspaces\Requests;

use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

#[SchemaName('UpdateWorkspaceBody')]
class UpdateWorkspaceRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => [
                'string',
                'min:3',
                'max:100',
                Rule::unique('workspaces')
                    ->where('owner_id', Auth::id())
                    ->ignore($this->route('id')),
            ],
            'image' => ['nullable', 'string'],
        ];
    }
}
