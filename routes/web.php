<?php

use App\CreatorServices\Controllers\PublicServicePageController;
use App\CreatorServices\Controllers\PublicServicesPageController;
use App\Demo\Controllers\DemoLoginController;
use App\Links\Controllers\FallbackRouteController;
use App\Links\Controllers\LinkImageController;
use App\QrCodes\Controllers\QrCodesController;
use App\Registry\Controllers\RegistryController;
use App\Storefront\Controllers\PublicDigitalProductPageController;
use Common\Blog\Http\Controllers\BlogController;
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
Route::get('my-portal', [HomeController::class, 'render']);
Route::get('my-portal/purchases', [HomeController::class, 'render']);
Route::get('my-portal/courses/{courseId}', [HomeController::class, 'render'])->whereNumber('courseId');
Route::get('my-portal/courses/{courseId}/lessons/{lessonId}', [HomeController::class, 'render'])
    ->whereNumber('courseId')
    ->whereNumber('lessonId');
Route::redirect('my-order', '/my-portal', 302);
Route::redirect('my-order/purchases', '/my-portal/purchases', 302);
Route::get('my-order/courses/{courseId}', fn (string $courseId) => redirect("/my-portal/courses/{$courseId}", 302))
    ->whereNumber('courseId');
Route::get('my-order/courses/{courseId}/lessons/{lessonId}', fn (string $courseId, string $lessonId) => redirect("/my-portal/courses/{$courseId}/lessons/{$lessonId}", 302))
    ->whereNumber('courseId')
    ->whereNumber('lessonId');

Route::get('dashboard/my-products/{product}/course/analytics', [HomeController::class, 'render'])->middleware(['auth', 'verified']);

// Keep client-side dashboard/admin URLs from being captured by the public
// `{storeSlug}/services` routes below.
Route::get('dashboard/{any?}', [HomeController::class, 'render'])->where('any', '.*');
Route::get('admin/{any?}', [HomeController::class, 'render'])->where('any', '.*');

Route::get('{storeSlug}/services', [PublicServicesPageController::class, 'show'])
    ->name('services.public.index');
Route::get('{storeSlug}/services/{service}', [PublicServicePageController::class, 'show'])
    ->name('services.public.show');

Route::get('{linkHash}/img', [LinkImageController::class, 'show']);

Route::get('{storeSlug}/products/{digitalProduct}', [PublicDigitalProductPageController::class, 'show'])
    ->whereNumber('digitalProduct')
    ->name('digital-products.public.show');
Route::get('{storeSlug}/products/{digitalProduct}/orders/{order}/success', [PublicDigitalProductPageController::class, 'success'])
    ->whereNumber('digitalProduct')
    ->name('digital-products.public.order.success');

// BLOG (public)
Route::name('blog.')->prefix('blog')->group(function () {
    Route::get('/', [BlogController::class, 'index'])->name('index');
    Route::get('categories', fn () => redirect()->route('blog.index'));
    Route::get('categories/{slug}', [BlogController::class, 'category'])->name('category');
    Route::get('{slug}', [BlogController::class, 'article'])->name('article');
});

// CATCH ALL ROUTES AND REDIRECT TO HOME
Route::fallback(FallbackRouteController::class);
