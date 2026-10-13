<?php

namespace Common\Blog\Http\Controllers;

use Common\Blog\Http\Requests\StoreBlogCategoryRequest;
use Common\Blog\Http\Resources\BlogCategoryResource;
use Common\Blog\Models\BlogCategory;
use Common\Core\BaseController;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

/**
 * @tags Blog
 */
class AdminBlogCategoryController extends BaseController
{
    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize('admin.access');

        $categories = BlogCategory::query()
            ->withCount('articles')
            ->when($request->filled('search'), function ($query) use ($request) {
                $term = '%'.$request->input('search').'%';

                $query->where(function (Builder $query) use ($term) {
                    $query->where('name', 'like', $term)
                        ->orWhere('slug', 'like', $term);
                });
            })
            ->orderBy('sort_id')
            ->orderBy('name')
            ->paginate((int) $request->input('perPage', 50));

        return BlogCategoryResource::collection($categories);
    }

    public function store(StoreBlogCategoryRequest $request): JsonResponse
    {
        Gate::authorize('admin.access');

        $category = BlogCategory::create($request->validated());

        return response()->json(
            ['category' => new BlogCategoryResource($category)],
            201,
        );
    }

    public function update(
        StoreBlogCategoryRequest $request,
        BlogCategory $category,
    ): JsonResponse {
        Gate::authorize('admin.access');

        $data = $request->validated();

        // Same table, different row — scope uniqueness to this category so
        // it is not rejected against its own slug.
        $validator = validator($data, [
            'slug' => [
                'nullable',
                'string',
                'max:255',
                'alpha_dash',
                Rule::unique('blog_categories', 'slug')->ignore(
                    $category->id,
                ),
            ],
        ]);
        $validator->validate();

        $category->update($data);
        $category->loadCount('articles');

        return response()->json([
            'category' => new BlogCategoryResource($category),
        ]);
    }

    /**
     * Deleting a category cascades to its articles. Returning 409 instead of
     * deleting silently gives the admin UI the chance to confirm the loss —
     * the FK cascade is not undoable.
     */
    public function destroy(BlogCategory $category)
    {
        Gate::authorize('admin.access');

        $articleCount = $category->articles()->count();

        if ($articleCount > 0) {
            return response()->json(
                [
                    'message' => __(
                        'This category still contains articles. Deleting it will also delete them.',
                    ),
                    'articles_count' => $articleCount,
                ],
                409,
            );
        }

        $category->delete();

        return response()->noContent();
    }
}