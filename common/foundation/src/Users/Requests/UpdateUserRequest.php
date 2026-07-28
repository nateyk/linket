<?php

namespace Common\Users\Requests;

use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Unique;

#[SchemaName('UpdateUserBody')]
class UpdateUserRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'email' => [
                'email',
                'min:3',
                'max:255',
                (new Unique('users', 'email'))->ignore($this->route('id')),
            ],
            'password' => 'min:3|max:50',
            'image' => 'string|max:255|nullable',
            'image_entry_id' => 'int|nullable',
            'email_is_verified' => 'boolean',
            // alpha and space/dash
            'name' => 'string|min:2|max:255|nullable|regex:/^[\pL\s\-]+$/u',

            'permissions' => 'array',
            'permissions.*.id' => 'integer',
            'permissions.*.restrictions' => 'array',
            'permissions.*.restrictions.*.name' => 'string',
            'permissions.*.restrictions.*.value' => '',

            'roles' => 'array',
            'roles.*' => 'int',

            'country' => 'nullable|string|max:20',
            'language' => 'nullable|string|max:20',
            'timezone' => 'nullable|string|max:50',
        ];
    }
}
