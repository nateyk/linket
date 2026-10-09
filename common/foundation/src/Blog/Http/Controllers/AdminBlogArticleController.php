<?php

namespace Common\Blog\Http\Controllers;

use Common\Blog\Http\Requests\StoreBlogArticleRequest;
use Common\Blog\Http\Requests\UpdateBlogArticleRequest;
use Common\Blog\Http\Resources\BlogArticleResource;
use Common\Blog\Models\BlogArticle;
use Common\Core\BaseController;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

/**
 * @tags Blog
 */
class AdminBlogArticleController extends BaseController
{
    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize('admin.access');

        $articles = BlogArticle::query()
            ->with(['category', 'author'])
            ->when($request->filled('search'), function ($query) use ($request) {
                $term = '%'.$request->input('search').'%';

                // Wrapped so these orWhere clauses cannot escape the scope
                // and return articles matching neither title nor excerpt.
                $query->where(function (Builder $query) use ($term) {
                    $query->where('title', 'like', $term)
                        ->orWhere('slug', 'like', $term)
                        ->orWhere('excerpt', 'like', $term);
                });
            })
            ->when($request->filled('status'), fn ($query) => $query->where(
                'status',
                $request->input('status'),
            ))
            ->when($request->filled('category'), fn ($query) => $query->where(
                'blog_category_id',
                $request->input('category'),
            ))
            ->latest('id')
            ->paginate((int) $request->input('perPage', 20));

        return BlogArticleResource::collection($articles);
    }

    public function store(StoreBlogArticleRequest $request): JsonResponse
    {
        Gate::authorize('admin.access');

        $data = $request->validated();
        $data['author_id'] ??= $request->user()->id;
        $data['status'] ??= 'draft';

        $article = BlogArticle::create($data);

        return response()->json(
            ['article' => new BlogArticleResource($article)],
            201,
        );
    }

    public function show(BlogArticle $article): JsonResponse
    {
        Gate::authorize('admin.access');

        $article->load(['category', 'author']);

        return response()->json([
            'article' => new BlogArticleResource($article),
        ]);
    }

    public function update(
        UpdateBlogArticleRequest $request,
        BlogArticle $article,
    ): JsonResponse {
        Gate::authorize('admin.access');

        $article->update($request->validated());
        $article->load(['category', 'author']);

        return response()->json([
            'article' => new BlogArticleResource($article),
        ]);
    }

    public function destroy(BlogArticle $article): Response
    {
        Gate::authorize('admin.access');

        $article->delete();

        return response()->noContent();
    }
}