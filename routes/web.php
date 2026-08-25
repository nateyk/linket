<?php

use App\Demo\Controllers\DemoLoginController;
use App\Links\Controllers\FallbackRouteController;
use App\Links\Controllers\LinkImageController;
use App\QrCodes\Controllers\QrCodesController;
use App\Registry\Controllers\RegistryController;
use App\Storefront\Controllers\PublicDigitalProductPageController;
use App\Storefront\Controllers\OrderLookupController;
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
Route::redirect('order-lookup', 'find-my-purchase');
Route::get('find-my-purchase', [HomeController::class, 'render']);
Route::get('find-my-purchase/orders', [HomeController::class, 'render']);
Route::get('find-my-purchase/access/{token}', [OrderLookupController::class, 'redeem'])->where('token', '[A-Za-z0-9]+');

Route::get('{linkHash}/img', [LinkImageController::class, 'show']);

Route::get('{storeSlug}/products/{digitalProduct}', [PublicDigitalProductPageController::class, 'show'])
    ->whereNumber('digitalProduct')
    ->name('digital-products.public.show');
Route::get('{storeSlug}/products/{digitalProduct}/orders/{order}/success', [PublicDigitalProductPageController::class, 'success'])
    ->whereNumber('digitalProduct')
    ->name('digital-products.public.order.success');

// CATCH ALL ROUTES AND REDIRECT TO HOME
Route::fallback(FallbackRouteController::class);
