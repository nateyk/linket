<?php

use App\Demo\Controllers\DemoLoginController;
use App\Links\Controllers\FallbackRouteController;
use App\Links\Controllers\LinkImageController;
use App\QrCodes\Controllers\QrCodesController;
use Common\Core\Controllers\HomeController;
use Common\Pages\CustomPageController;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Support\Facades\Route;

if (config('app.demo')) {
  Route::post('demo-login', DemoLoginController::class)->withoutMiddleware(VerifyCsrfToken::class);
}

Route::get('qr/{hashOrAlias}', [QrCodesController::class, 'redirectToDestination']);

Route::get('contact', [HomeController::class, 'render']);
Route::get('pages/{slugOrId}', [CustomPageController::class, 'show']);
Route::get('forgot-password', [HomeController::class, 'render']);

Route::get('{linkHash}/img', [LinkImageController::class, 'show']);

// CATCH ALL ROUTES AND REDIRECT TO HOME
Route::fallback(FallbackRouteController::class);
