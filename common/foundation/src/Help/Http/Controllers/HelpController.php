<?php

namespace Common\Help\Http\Controllers;

use Common\Help\Http\Resources\HelpArticleResource;
use Common\Help\Http\Resources\HelpCategoryResource;
use Common\Help\Models\HelpArticle;
use Common\Help\Models\HelpCategory;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class HelpController extends Controller
{
    public function index(Request $request)
    {
        $commonCategories = HelpCategory::orderByDesc('views')->limit(4)->get();

        if (!$request->filled('search')) {
            $categories = HelpCategory::with('articles')->get()->map(function (HelpCategory $category) {
                $category->setRelation('articles', $category->articles->take(8));
                return $category;
            });
        } else {
            $searchTerm = '%' . $request->input('search') . '%';

            $categories = HelpCategory::where(function ($query) use ($searchTerm) {
                $query->where('name', 'like', $searchTerm)
                    ->orWhere('slug', 'like', $searchTerm);
            })
                ->orWhereHas('articles', function ($query) use ($searchTerm) {
                    $query->where('title', 'like', $searchTerm)
                        ->orWhere('slug', 'like', $searchTerm)
                        ->orWhere('body', 'like', $searchTerm)
                        ->orWhere('short_description', 'like', $searchTerm);
                })
                ->with(['articles' => function ($query) use ($searchTerm) {
                    $query->where('title', 'like', $searchTerm)
                        ->orWhere('slug', 'like', $searchTerm)
                        ->orWhere('body', 'like', $searchTerm)
                        ->orWhere('short_description', 'like', $searchTerm);
                }])
                ->get()
                ->map(function (HelpCategory $category) {
                    $category->setRelation('articles', $category->articles->take(8));
                    return $category;
                });
        }

        return response()->json([
            'categories' => HelpCategoryResource::collection($categories)->resolve(),
            'commonCategories' => HelpCategoryResource::collection($commonCategories)->resolve(),
        ]);
    }

    public function category(string $slug)
    {
        $category = HelpCategory::where('slug', $slug)->firstOrFail();

        $category->increment('views');

        $articles = HelpArticle::where('help_category_id', $category->id)->paginate(20);

        return response()->json([
            'category' => (new HelpCategoryResource($category))->resolve(),
            'articles' => HelpArticleResource::collection($articles)->resolve(),
            'pagination' => [
                'current_page' => $articles->currentPage(),
                'last_page' => $articles->lastPage(),
                'per_page' => $articles->perPage(),
                'total' => $articles->total(),
            ],
        ]);
    }

    public function article(string $slug)
    {
        $article = HelpArticle::where('slug', $slug)->with('category')->firstOrFail();

        $article->increment('views');

        $relatedArticles = HelpArticle::where('help_category_id', $article->category->id)
            ->where('id', '!=', $article->id)
            ->inRandomOrder()
            ->limit(10)
            ->get();

        return response()->json([
            'article' => (new HelpArticleResource($article))->resolve(),
            'relatedArticles' => HelpArticleResource::collection($relatedArticles)->resolve(),
        ]);
    }

    public function react(Request $request, string $slug)
    {
        $request->validate(['action' => ['required', 'integer', 'in:1,2']]);

        $article = HelpArticle::where('slug', $slug)->firstOrFail();

        if ((int) $request->input('action') === 1) {
            $article->increment('likes');
        } else {
            $article->increment('dislikes');
        }

        return response()->json(['message' => __('Thanks for your feedback')]);
    }
}
