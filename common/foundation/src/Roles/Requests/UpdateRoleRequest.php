<?php

namespace Common\Roles\Requests;

use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

#[SchemaName('UpdateRoleBody')]
class UpdateRoleRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => [
                'min:2',
                'max:50',
                Rule::unique('roles', 'name')->ignore($this->route('id')),
            ],
            'description' => 'nullable|string|max:150',
            'type' => 'string',
            'permissions' => 'array',
            'permissions.*.id' => 'integer',
            'permissions.*.restrictions' => 'array',
            'permissions.*.restrictions.*.name' => 'string',
            'permissions.*.restrictions.*.value' => '',
        ];
    }
}
