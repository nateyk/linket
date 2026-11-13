<?php

namespace App\HelpCenter\Controllers;

use App\HelpCenter\Actions\ReorderHelpCenterItems;
use App\HelpCenter\Models\HcArticle;
use App\HelpCenter\Models\HcCategory;
use Common\Core\BaseController;
use Illuminate\Support\Facades\DB;

class HelpCenterManagerController extends BaseController
{
    public function categories(int|null $categoryId = null)
    {
        $this->authorize('update', HcArticle::class);

        $query = HcCategory::query()->withCount('articles');

        if (!is_null($categoryId)) {
            $query->where('parent_id', $categoryId);
        } else {
            $query->whereNull('parent_id')->withCount('sections');
        }

        $categories = $query
            ->orderBy('position', 'asc')
            ->with('tags')
            ->get();

        $rootArticleCounts = collect();
        if (is_null($categoryId)) {
            $rootArticleCounts = DB::table('category_article')
                ->join('categories as sections', 'sections.id', '=', 'category_article.category_id')
                ->whereIn('sections.parent_id', $categories->pluck('id'))
                ->groupBy('sections.parent_id')
                ->selectRaw('sections.parent_id as category_id, count(distinct category_article.article_id) as aggregate')
                ->pluck('aggregate', 'category_id');
        }

        $data = [
            'categories' => $categories->map(function ($category) use ($rootArticleCounts, $categoryId) {
                $articlesCount = $category->articles_count;
                if (is_null($categoryId) && $category->parent_id === null) {
                    $articlesCount = (int) ($rootArticleCounts[$category->id] ?? 0);
                }

                return [
                    'id' => $category->id,
                    'name' => $category->name,
                    'is_section' => $category->is_section,
                    'parent_id' => $category->parent_id,
                    'description' => $category->description,
                    'image' => $category->image,
                    'visible_to_role' => $category->visible_to_role,
                    'managed_by_role' => $category->managed_by_role,
                    'articles_count' => $articlesCount,
                    'sections_count' => $category->sections_count,
                    'tags' => $category->tags->pluck('name')->toArray(),
                ];
            }),
        ];

        if ($categoryId) {
            $category = HcCategory::find($categoryId);
            $data['category'] = [
                'id' => $category->id,
                'name' => $category->name,
            ];
        }

        return $this->success($data);
    }

    public function articles(int $sectionId)
    {
        $this->authorize('update', HcArticle::class);

        $section = HcCategory::findOrFail($sectionId);
        $category = HcCategory::findOrFail($section->parent_id);

        return $this->success([
            'articles' => HcArticle::query()
                ->join(
                    'category_article',
                    'articles.id',
                    'category_article.article_id',
                )
                ->where('category_article.category_id', $section->id)
                ->orderBy('category_article.position', 'asc')
                ->select('articles.*', 'category_article.position as pivot_position')
                ->get()
                ->map(function ($article) {
                    return [
                        'id' => $article->id,
                        'title' => $article->title,
                        'position' => $article->pivot_position,
                    ];
                }),
            'section' => [
                'id' => $section->id,
                'name' => $section->name,
            ],
            'category' => [
                'id' => $category->id,
                'name' => $category->name,
            ],
        ]);
    }

    public function reorderCategories()
    {
        $this->authorize('update', HcArticle::class);

        $data = $this->validate(request(), [
            'parentId' => 'nullable|integer|exists:categories,id',
            'ids' => 'required|array|min:1|max:1000',
            'ids.*' => 'required|integer|min:1|distinct|exists:categories,id',
        ]);

        (new ReorderHelpCenterItems())->categories(
            $data['ids'],
            $data['parentId'] ?? null,
        );

        return $this->success();
    }

    public function reorderArticles(int $sectionId)
    {
        $this->authorize('update', HcArticle::class);

        $data = $this->validate(request(), [
            'ids' => 'required|array|min:1|max:1000',
            'ids.*' => 'required|integer|min:1|distinct|exists:articles,id',
        ]);

        (new ReorderHelpCenterItems())->articles($data['ids'], $sectionId);

        return $this->success();
    }
}
