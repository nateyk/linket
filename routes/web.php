<?php

use App\CreatorServices\Controllers\PublicServicePageController;
use App\CreatorServices\PublicCreatorServices;
use App\Demo\Controllers\DemoLoginController;
use App\HelpCenter\Controllers\LegacyHelpRedirectController;
use App\HelpCenter\Controllers\SearchTermController;
use App\Links\Controllers\FallbackRouteController;
use App\Links\Controllers\LinkImageController;
use App\QrCodes\Controllers\QrCodesController;
use App\Registry\Controllers\RegistryController;
use App\Storefront\Controllers\PublicDigitalProductPageController;
use Common\Blog\Http\Controllers\BlogController;
use Common\Core\Controllers\HomeController;
use Common\Pages\CustomPageController;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Support\Facades\Route;

if (config('app.demo')) {
  Route::post('demo-login', DemoLoginController::class)->withoutMiddleware(PreventRequestForgery::class);
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

Route::get('{linkHash}/img', [LinkImageController::class, 'show']);

Route::get('{storeSlug}/products/{digitalProduct}', [PublicDigitalProductPageController::class, 'show'])
    ->whereNumber('digitalProduct')
    ->name('digital-products.public.show');
Route::get('{storeSlug}/products/{digitalProduct}/orders/{order}/success', [PublicDigitalProductPageController::class, 'success'])
    ->whereNumber('digitalProduct')
    ->name('digital-products.public.order.success');

// Help Center uses sendBeacon on page leave. Keep CSRF protection active.
Route::post('search-term', [SearchTermController::class, 'storeSearchSession'])
    ->middleware('throttle:30,1');

// Legacy Linket Help KB slugs → BeDesk HC
Route::get('help/articles/{slug}', [LegacyHelpRedirectController::class, 'article']);
Route::get('help/categories/{slug}', [LegacyHelpRedirectController::class, 'category']);

// BLOG (public)
Route::name('blog.')->prefix('blog')->group(function () {
    Route::get('/', [BlogController::class, 'index'])->name('index');
    Route::get('categories', fn () => redirect()->route('blog.index'));
    Route::get('categories/{slug}', [BlogController::class, 'category'])->name('category');
    Route::get('{slug}', [BlogController::class, 'article'])->name('article');
});

// Public creator services. Registered after the blog group so a blog article
// slugged "services" is not swallowed by `{storeSlug}/services`.
//
// Services are a tab on the storefront, like Products and About — there is no
// separate list page. The old list URL still resolves, but sends the visitor
// to that tab so inbound links and search results keep working.
Route::get('{storeSlug}/services', function (string $storeSlug) {
    app(PublicCreatorServices::class)->findStore($storeSlug);

    return redirect("/{$storeSlug}?section=services", 301);
})->name('services.public.index');
Route::get('{storeSlug}/services/{service}', [PublicServicePageController::class, 'show'])
    ->name('services.public.show');

// Explicit Linket OAuth browser consent is separately default OFF.
// This inclusion must occur before the storefront fallback.
require __DIR__.'/creator-ai-mcp-oauth.php';

// CATCH ALL ROUTES AND REDIRECT TO HOME
Route::fallback(FallbackRouteController::class);
