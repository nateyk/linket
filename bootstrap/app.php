<?php

use Common\Core\Application;

return Application::create(
    basePath: dirname(__DIR__),
    providers: [
        App\CreatorAi\Auth\CreatorMcpOAuthServiceProvider::class,
        App\Providers\SupportServiceProvider::class,
    ],
);
