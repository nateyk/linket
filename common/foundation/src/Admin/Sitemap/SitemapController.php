<?php

namespace Common\Admin\Sitemap;

use Common\Core\Demo\BlockedOnDemoSite;
use Common\API\ExcludeRoutesFromPublicDocs;
use Illuminate\Routing\Controller;

/**
 * @tags System
 */
#[ExcludeRoutesFromPublicDocs]
class SitemapController extends Controller
{
    public function __construct()
    {
        $this->middleware('isAdmin');
    }

    /**
     * Generate sitemap.
     *
     * @operationId generateSitemap
     */
    #[BlockedOnDemoSite]
    public function generate()
    {
        $sitemap = app(BaseSitemapGenerator::class);

        if (class_exists('App\Core\SitemapGenerator')) {
            $sitemap = app('App\Core\SitemapGenerator');
        } elseif (class_exists('App\Services\SitemapGenerator')) {
            $sitemap = app('App\Services\SitemapGenerator');
        }

        $sitemap->generate();

        return response()->noContent();
    }
}
