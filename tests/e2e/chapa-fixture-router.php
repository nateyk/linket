<?php

declare(strict_types=1);

use Illuminate\Http\Request;

// This router is outside public/ and is never a production route. It replaces
// artisan serve only in the isolated browser CI job.
if (
    getenv('APP_ENV') !== 'testing'
    || getenv('DB_DATABASE') !== 'belink_test'
    || getenv('DB_HOST') !== '127.0.0.1'
    || getenv('APP_URL') !== 'http://127.0.0.1:8081'
    || getenv('LINKET_ISOLATED_E2E') !== '1'
    || getenv('CHAPA_SECRET_KEY') !== 'CHASECK_TEST-isolated-browser-fixture'
) {
    http_response_code(503);
    exit('Isolated browser test environment required.');
}

$root = dirname(__DIR__, 2);
$public = $root.'/public';
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$file = realpath($public.$path);
if ($file && str_starts_with($file, $public.DIRECTORY_SEPARATOR) && is_file($file)) {
    return false;
}

define('LARAVEL_START', microtime(true));
require $root.'/vendor/autoload.php';
$app = require $root.'/bootstrap/app.php';
$app->booted(static function (): void {
    \Tests\Support\ChapaBrowserFixture::register();
});
$app->handleRequest(Request::capture());
