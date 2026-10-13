<?php

namespace Common\Blog\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateBlogArticleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('id');

        return [
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            // Scoped to blog_articles with the current row ignored — the
            // marketbob reference validates the article slug against
            // blog_categories here, which is a bug.
            'slug' => [
                'sometimes',
                'nullable',
                'string',
                'max:255',
                'alpha_dash',
                Rule::unique('blog_articles', 'slug')->ignore($id),
            ],
            'excerpt' => ['sometimes', 'nullable', 'string', 'max:500'],
            'body' => ['sometimes', 'required', 'string'],
            'blog_category_id' => [
                'sometimes',
                'required',
                'integer',
                Rule::exists('blog_categories', 'id'),
            ],
            'cover_image' => ['sometimes', 'nullable', 'string', 'max:255'],
            'meta_title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'meta_description' => [
                'sometimes',
                'nullable',
                'string',
                'max:500',
            ],
            'status' => ['sometimes', 'nullable', Rule::in(['draft', 'published'])],
            'published_at' => ['sometimes', 'nullable', 'date'],
        ];
    }
}