<?php namespace App\HelpCenter\Controllers;

use App\HelpCenter\Actions\HcLandingPageLoader;
use Common\Core\BaseController;

class HcLandingPageController extends BaseController
{
    public function __invoke()
    {
        $variant = settings('hcLanding.content.variant', 'articleGrid');

        $data = (new HcLandingPageLoader())->loadData([
            'categoryLimit' => settings('hcLanding.children_per_category', 6),
            'articleLimit' => settings('hcLanding.articles_per_category', 5),
            'rootCategoryLimit' => $variant === 'multiProduct' ? 10 : 1,
            'loadArticles' => $variant === 'categoryGrid',
        ]);

        return $this->renderClientOrApi([
            'data' => $data,
            'pageName' => 'hc-landing-page',
        ]);
    }
}
