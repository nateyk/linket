<?php namespace App\Core;

use App\HelpCenter\Models\HcArticle;
use App\HelpCenter\Models\HcCategory;
use Common\Admin\Sitemap\BaseSitemapGenerator;
use Common\Core\Contracts\AppUrlGenerator;
use Illuminate\Database\Eloquent\Model;

class SitemapGenerator extends BaseSitemapGenerator
{
    protected function getAppQueries(): array
    {
        return [
            // Sitemaps are public even when an admin triggers generation.
            HcArticle::query()->visibleToAudience(forGuest: true)->select(['id', 'title']),
            HcCategory::query()->filterByVisibleToRole(forGuest: true)->select(['id', 'name']),
        ];
    }

    protected function getModelUrl(Model $model): string
    {
        $urls = app(AppUrlGenerator::class);

        if ($model instanceof HcArticle) {
            return $urls->article($model);
        }

        if ($model instanceof HcCategory) {
            return $urls->category($model);
        }

        return parent::getModelUrl($model);
    }

    protected function getAppStaticUrls(): array
    {
        return ['hc'];
    }
}
