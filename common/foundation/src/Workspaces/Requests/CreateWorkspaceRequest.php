<?php

namespace Common\Workspaces\Requests;

use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

#[SchemaName('CreateWorkspaceBody')]
class CreateWorkspaceRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => [
                'required',
                'string',
                'min:3',
                'max:100',
                Rule::unique('workspaces')->where('owner_id', Auth::id()),
            ],
            'image' => ['nullable', 'string'],
        ];
    }
}
