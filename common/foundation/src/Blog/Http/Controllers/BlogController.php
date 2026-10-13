<?php

namespace Common\Blog\Http\Controllers;

use Common\Blog\Http\Resources\BlogArticleResource;
use Common\Blog\Http\Resources\BlogCategoryResource;
use Common\Blog\Models\BlogArticle;
use Common\Blog\Models\BlogCategory;
use Common\Core\BaseController;
use Illuminate\Http\Request;

class BlogController extends BaseController
{
    public function index(Request $request)
    {
        $articles = BlogArticle::query()
            ->published()
            ->with('category')
            ->when($request->filled('search'), function ($query) use ($request) {
                $term = '%'.$request->input('search').'%';
                $query->where(function ($q) use ($term) {
                    $q->where('title', 'like', $term)
                      ->orWhere('slug', 'like', $term)
                      ->orWhere('excerpt', 'like', $term);
                });
            })
            ->latest('published_at')
            ->paginate(20);

        $resource = BlogArticleResource::collection($articles);

        if (isApiRequest()) {
            return response()->json([
                'data' => $resource->resolve(),
                'pagination' => [
                    'current_page' => $articles->currentPage(),
                    'last_page' => $articles->lastPage(),
                    'per_page' => $articles->perPage(),
                    'total' => $articles->total(),
                ],
            ]);
        }

        return $this->clientSideOrPrerenderedResponse([
            'pageName' => 'blog-index',
            'loader' => 'blogIndex',
            'data' => [
                'articles' => $resource,
                'pagination' => [
                    'current_page' => $articles->currentPage(),
                    'last_page' => $articles->lastPage(),
                    'per_page' => $articles->perPage(),
                    'total' => $articles->total(),
                ],
            ],
        ]);
    }

    public function category(string $slug)
    {
        $category = BlogCategory::where('slug', $slug)->firstOrFail();
        $category->increment('views');

        $articles = BlogArticle::query()
            ->published()
            ->where('blog_category_id', $category->id)
            ->with('category')
            ->latest('published_at')
            ->paginate(20);

        $articlesResource = BlogArticleResource::collection($articles);
        $categoryResource = new BlogCategoryResource($category);

        if (isApiRequest()) {
            return response()->json([
                'category' => $categoryResource->resolve(),
                'articles' => $articlesResource->resolve(),
                'pagination' => [
                    'current_page' => $articles->currentPage(),
                    'last_page' => $articles->lastPage(),
                    'per_page' => $articles->perPage(),
                    'total' => $articles->total(),
                ],
            ]);
        }

        return $this->clientSideOrPrerenderedResponse([
            'pageName' => 'blog-category',
            'loader' => 'blogCategory',
            'data' => [
                'category' => new BlogCategoryResource($category),
                'articles' => BlogArticleResource::collection($articles),
                'pagination' => [
                    'current_page' => $articles->currentPage(),
                    'last_page' => $articles->lastPage(),
                    'per_page' => $articles->perPage(),
                    'total' => $articles->total(),
                ],
            ],
        ]);
    }

    public function article(string $slug)
    {
        $article = BlogArticle::query()
            ->published()
            ->where('slug', $slug)
            ->with('category')
            ->firstOrFail();

        $article->increment('views');

        $related = BlogArticle::query()
            ->published()
            ->where('blog_category_id', $article->blog_category_id)
            ->where('id', '!=', $article->id)
            ->inRandomOrder()
            ->limit(10)
            ->get();

        $articleResource = new BlogArticleResource($article);
        $relatedResource = BlogArticleResource::collection($related);

        if (isApiRequest()) {
            return response()->json([
                'article' => $articleResource->resolve(),
                'relatedArticles' => BlogArticleResource::collection($related)->resolve(),
            ]);
        }

        return $this->clientSideOrPrerenderedResponse([
            'pageName' => 'blog-article',
            'loader' => 'blogArticle',
            'data' => [
                'article' => $articleResource,
                'relatedArticles' => $relatedResource,
            ],
        ]);
    }
}