<?php

namespace App\HelpCenter\Controllers;

use App\HelpCenter\Models\HcArticle;
use App\HelpCenter\Models\HcCategory;
use Common\Core\BaseController;
use Illuminate\Support\Str;

class LegacyHelpRedirectController extends BaseController
{
    public function article(string $slug)
    {
        $article = HcArticle::query()
            ->where('slug', $slug)
            ->orWhere('slug', "{$slug}-linket-" . request()->integer('id'))
            ->first();

        if (! $article) {
            return redirect('/help', 301);
        }

        return redirect("/hc/articles/{$article->id}/{$article->slug}", 301);
    }

    public function category(string $slug)
    {
        $category = HcCategory::query()
            ->whereNull('parent_id')
            ->get()
            ->first(
                fn (HcCategory $category) => Str::slug($category->name) === $slug,
            );

        if (! $category) {
            return redirect('/help', 301);
        }

        return redirect(
            "/hc/categories/{$category->id}/" . Str::slug($category->name),
            301,
        );
    }
}
