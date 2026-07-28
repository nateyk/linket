<?php

namespace Common\Files\Tus;

use Common\Core\AppUrl;
use Illuminate\Support\ServiceProvider;

class TusServiceProvider extends ServiceProvider
{
    static function uploadDir(): string
    {
        return storage_path('tus');
    }

    public function register()
    {
        $this->app->singleton('tus-server', function () {
            $server = new TusServer();

            $baseUri = app(AppUrl::class)->htmlBaseUri;

            $server
                ->setApiPath("{$baseUri}api/v1/tus/upload")
                ->setUploadDir(TusServiceProvider::uploadDir());

            return $server;
        });
    }
}
