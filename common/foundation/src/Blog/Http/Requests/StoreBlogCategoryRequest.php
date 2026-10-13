<?php

namespace Common\Blog\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBlogCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'slug' => [
                'nullable',
                'string',
                'max:255',
                'alpha_dash',
                Rule::unique('blog_categories', 'slug'),
            ],
            'description' => ['nullable', 'string', 'max:1000'],
            'sort_id' => ['nullable', 'integer'],
        ];
    }
}