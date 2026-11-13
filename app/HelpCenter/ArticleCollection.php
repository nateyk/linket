<?php

namespace App\HelpCenter;

use App\HelpCenter\Models\HcCategory;
use Illuminate\Support\Facades\Auth;
use Illuminate\Database\Eloquent\Collection;

class ArticleCollection extends Collection
{
    public function loadPath(
        int|HcCategory|null $category = null,
        ?int $sectionId = null,
    ): static {
        $this->load([
            'path' => function ($q) use ($category) {
                if (!Auth::user()?->isAgent()) {
                    $q->filterByVisibleToRole();
                }

                return $q->when($category, function ($q) use ($category) {
                    // if there's a category filter, return path in that category,
                    // otherwise use the first available category
                    $categoryId =
                        $category instanceof HcCategory
                            ? $category->parent_id ?? $category->id
                            : $category;
                    $q->where(function ($paths) use ($categoryId) {
                        $paths->where('categories.id', $categoryId)
                            ->orWhere('categories.parent_id', $categoryId);
                    });
                });
            },
        ]);

        $this->each(function ($article) use ($sectionId) {
            $category = $article->path->first(fn($c) => $c->parent_id === null);
            $section = $article->path->first(
                fn($s) => $sectionId
                    ? $s->id == $sectionId
                    : $s->parent_id !== null,
            );
            $article->setRelation(
                'path',
                collect([$category, $section])
                    ->filter()
                    ->values(),
            );
        });

        return $this;
    }
}
