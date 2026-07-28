<?php

namespace Common\Core\Rendering;

use Common\Core\AppUrl;
use Common\Core\Bootstrap\BootstrapData;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Facades\Vite;

trait RendersClientSideApp
{
    protected function clientSideOrPrerenderedResponse(array $options)
    {
        $data = Arr::get($options, 'data', []);

        if ($data instanceof JsonResource) {
            $data = ['data' => $data->resolve()];
        }

        $isApiRequest = isApiRequest();
        $requestIsFromFrontend = requestIsFromFrontend();
        $pageName = Arr::get($options, 'pageName');
        if ($pageName) {
            $seoTagsView = View::exists("editable-views::seo-tags.$pageName")
                ? "editable-views::seo-tags.$pageName"
                : "seo.$pageName.seo-tags";
        }

        // seo should not be included only for non-internal API requests
        if (isset($seoTagsView) && (!$isApiRequest || $requestIsFromFrontend)) {
            $data['seoTags'] = view($seoTagsView, $data)->render();
        }

        // if it's an API request, simply return data as JSON
        if (isApiRequest()) {
            return response()->json($data);
        }

        // if it's a web request, prerender a simple blade page for crawlers
        if (
            !Arr::get($options, 'noPrerender') &&
            isCrawler() &&
            $pageName &&
            View::exists("seo.$pageName.prerender")
        ) {
            return view("seo.$pageName.prerender", $data)->with([
                'htmlBaseUri' => app(AppUrl::class)->htmlBaseUri,
            ]);
        }

        // finally render the full react app
        return $this->clientSideResponse([
            'data' => $data,
            'loader' => Arr::get($options, 'loader'),
        ]);
    }

    protected function clientSideResponse(array $options = [])
    {
        $bootstrapData = app(BootstrapData::class)->init();
        $data = Arr::get($options, 'data', []);

        if ($loader = Arr::get($options, 'loader')) {
            $bootstrapData->set("loaders.$loader", $data);
        }

        $view = view('app')
            ->with($data)
            ->with('devCssPath', $this->getDevCssPath())
            ->with('bootstrapData', $bootstrapData)
            ->with('htmlBaseUri', app(AppUrl::class)->htmlBaseUri)
            ->with(
                'customHtmlPath',
                public_path('storage/custom-code/custom-html.html'),
            )
            ->with(
                'customCssPath',
                public_path('storage/custom-code/custom-styles.css'),
            );

        return response($view);
    }

    protected function getDevCssPath(): string|null
    {
        if (config('app.env') !== 'local' || !Vite::isRunningHot()) {
            return null;
        }

        $manifestPath = public_path('build/manifest.json');
        if (!file_exists($manifestPath)) {
            return null;
        }

        $manifest = json_decode(file_get_contents($manifestPath), true);
        $cssPath =
            'build/' . ($manifest['resources/client/main.css']['file'] ?? null);

        if (file_exists(public_path($cssPath))) {
            return $cssPath;
        }

        return null;
    }
}
