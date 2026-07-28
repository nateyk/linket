<?php

namespace Common\Users\Requests;

use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Foundation\Http\FormRequest;

#[SchemaName('CreateUserBody')]
class CreateUserRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'email' => 'required|email|min:3|max:255|unique:users,email',
            'password' => 'required|min:3|max:50',
            'image' => 'string|max:255|nullable',
            'image_entry_id' => 'int|nullable',
            'email_verified_at' => 'string',
            // alpha and space/dash
            'name' => 'string|min:2|max:255|nullable|regex:/^[\pL\s\-]+$/u',

            'permissions' => 'array',
            'permissions.*.id' => 'integer',
            'permissions.*.restrictions' => 'array',
            'permissions.*.restrictions.*.name' => 'string',
            'permissions.*.restrictions.*.value' => '',

            'roles' => 'array',
            'roles.*' => 'int',

            'country' => 'nullable|string|max:255',
            'language' => 'nullable|string|max:255',
            'timezone' => 'nullable|string|max:255',
        ];
    }
}
