<?php

use Illuminate\Support\Str;

return [
    /*
    | Laravel 13 changes the default session cookie to Str::snake().
    | Keep the Laravel 12 name so existing sessions stay valid.
    */
    'cookie' => env(
        'SESSION_COOKIE',
        Str::slug((string) env('APP_NAME', 'laravel'), '_').'_session',
    ),
];
