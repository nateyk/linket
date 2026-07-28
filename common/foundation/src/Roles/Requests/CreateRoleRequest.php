<?php

namespace Common\Roles\Requests;

use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Foundation\Http\FormRequest;

#[SchemaName('CreateRoleBody')]
class CreateRoleRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => 'required|unique:roles|min:2|max:50',
            'description' => 'nullable|string|max:150',
            'type' => 'string',
            'permissions' => 'array',
            'permissions.*.id' => 'integer',
            'permissions.*.restrictions' => 'array',
            'permissions.*.restrictions.*.name' => 'string',
            'permissions.*.restrictions.*.value' => 'string|int|bool',
        ];
    }
}
