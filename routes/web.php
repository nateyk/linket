<?php

use App\Demo\Controllers\DemoLoginController;
use App\Links\Controllers\FallbackRouteController;
use App\Links\Controllers\LinkImageController;
use App\QrCodes\Controllers\QrCodesController;
use App\Registry\Controllers\RegistryController;
use App\Storefront\Controllers\PublicDigitalProductPageController;
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
Route::get('my-order', [HomeController::class, 'render']);
Route::get('my-order/purchases', [HomeController::class, 'render']);
Route::get('my-order/courses/{courseId}', [HomeController::class, 'render'])->whereNumber('courseId');
Route::get('my-order/courses/{courseId}/lessons/{lessonId}', [HomeController::class, 'render'])
    ->whereNumber('courseId')
    ->whereNumber('lessonId');

Route::get('{linkHash}/img', [LinkImageController::class, 'show']);

Route::get('{storeSlug}/products/{digitalProduct}', [PublicDigitalProductPageController::class, 'show'])
    ->whereNumber('digitalProduct')
    ->name('digital-products.public.show');
Route::get('{storeSlug}/products/{digitalProduct}/orders/{order}/success', [PublicDigitalProductPageController::class, 'success'])
    ->whereNumber('digitalProduct')
    ->name('digital-products.public.order.success');

// CATCH ALL ROUTES AND REDIRECT TO HOME
Route::fallback(FallbackRouteController::class);
