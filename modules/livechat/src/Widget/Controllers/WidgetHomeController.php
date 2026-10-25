<?php

namespace Livechat\Widget\Controllers;

use Common\Core\AppUrl;
use Common\Core\BaseController;
use Illuminate\Support\Str;
use Livechat\Actions\WidgetBootstrapData;
use Symfony\Component\HttpFoundation\Cookie;

class WidgetHomeController extends BaseController
{
    public function __invoke()
    {
        $bootstrapData = new WidgetBootstrapData();
        $view = view('livechat::chat-widget')
            ->with('bootstrapData', $bootstrapData)
            ->with('htmlBaseUri', app(AppUrl::class)->htmlBaseUri);

        $trustedDomains = Str::of(settings('lc.trusted_domains'))
            ->explode(',')
            ->map(fn($domain) => trim($domain))
            ->filter()
            ->push(parse_url(config('app.url'), PHP_URL_HOST))
            ->unique()
            ->join(' ');

        $response = response($view);

        if ($trustedDomains) {
            $response->header(
                'Content-Security-Policy',
                "frame-ancestors $trustedDomains",
            );
        }

        return $response;
    }
}
