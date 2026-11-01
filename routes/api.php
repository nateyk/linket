<?php


/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

use App\Analytics\Controllers\AdminAnalyticsController;
use App\Analytics\Controllers\AdminCommerceInsightsController;
use App\CreatorServices\Controllers\Admin\AdminServiceCategoryController;
use App\CreatorServices\Controllers\Admin\AdminServiceSubcategoryController;
use App\CreatorServices\Controllers\CreatorServicesController;
use App\CreatorServices\Controllers\PublicServiceCategoriesController;
use App\CreatorServices\Controllers\PublicServicesController;
use App\CreatorServices\Controllers\ServiceInquiriesController;
use Common\Auth\Middleware\VerifyApiAccessMiddleware;
use Common\Core\Middleware\EnsureFrontendRequestsAreStateful;
use Common\Core\Middleware\VerifyCsrfToken;
use App\Http\Controllers\LandingPageController;
use App\Kyc\Controllers\AdminKycVerificationsController;
use App\Kyc\Controllers\KycVerificationsController;
use App\Links\Controllers\LinksController;
use Common\Blog\Http\Controllers\BlogController;
use Common\Blog\Http\Controllers\AdminBlogArticleController;
use Common\Blog\Http\Controllers\AdminBlogCategoryController;
use App\Folders\Controllers\FolderLinksController;
use App\QrCodes\Controllers\QrCodesController;
use App\Folders\Controllers\FoldersController;
use App\LinkOverlays\Controllers\LinkOverlaysController;
use App\LinkPages\Controllers\LinkPagesController;
use App\Links\Controllers\LinkPasswordController;
use App\Links\Controllers\LinkMetaTagsController;
use App\Http\Controllers\UsageController;
use App\Analytics\Controllers\TrackedEventsController;
use App\Biolinks\Controllers\BiolinkAppearanceController;
use App\Biolinks\Controllers\BiolinkContentOrderController;
use App\Biolinks\Controllers\BiolinkLinkController;
use App\Biolinks\Controllers\BiolinksController;
use App\Biolinks\Controllers\BiolinkWidgetsController;
use App\Biolinks\Controllers\CreatorProfileController;
use App\TrackingPixels\Controllers\TrackingPixelsController;
use App\Telegram\Controllers\TelegramConnectionController;
use App\Webhooks\Controllers\WebhookAttemptsController;
use App\Webhooks\Controllers\WebhooksController;
use App\Tags\Controllers\TagsController;
use Common\Domains\CustomDomainsController;
use App\Storefront\Controllers\AdminPayoutRequestsController;
use App\Storefront\Controllers\DigitalProductWithdrawalMethodsController;
use App\Storefront\Controllers\WorkspacePayoutConfigController;
use Illuminate\Support\Facades\Route;
use App\Stores\Controllers\StoresController;
use App\Stores\Controllers\StoreLinkController;
use App\Stores\Controllers\StoreContentOrderController;
use App\Stores\Controllers\CreatorProfileController as StoreCreatorProfileController;
use App\Stores\Controllers\StoreAppearanceController;
use App\Stores\Controllers\StoreWidgetsController;

Route::group(['prefix' => 'v1'], function() {

    // LANDING
    Route::get('landing-page-data', [LandingPageController::class, 'show']);

    // BeDesk-native support (HC, tickets, agents, email)
    require __DIR__ . '/support.php';

    // BLOG (public API)
    // Named `blog.api.*` because routes/web.php already owns `blog.*` for the
    // public HTML pages — duplicate route names break `route:cache`.
    Route::name('blog.api.')->prefix('blog')->group(function () {
        Route::get('/', [BlogController::class, 'index'])->name('index');
        Route::get('categories/{slug}', [BlogController::class, 'category'])->name('category');
        Route::get('{slug}', [BlogController::class, 'article'])->name('article');
    });

    // SERVICE CATEGORIES (public)
    Route::get('public/service-categories', PublicServiceCategoriesController::class)
        ->name('service-categories.index');

    // Public creator services. Inquiry posts are anonymous, same as checkout.
    Route::get('public/stores/{biolink}/services', [PublicServicesController::class, 'index']);
    Route::get('public/stores/{biolink}/services/{service}', [PublicServicesController::class, 'show']);
    Route::post('public/stores/{biolink}/services/{service}/inquiries', [PublicServicesController::class, 'inquiry'])
        ->middleware('throttle:10,1')
        ->withoutMiddleware([
            EnsureFrontendRequestsAreStateful::class,
            VerifyCsrfToken::class,
            VerifyApiAccessMiddleware::class,
        ]);

    Route::group(['middleware' => ['optionalAuth:sanctum', 'verified', 'verifyApiAccess']], function () {
        Route::get('tracked-events/report', [TrackedEventsController::class, 'report']);
        Route::get('admin/analytics/cards-data', [AdminAnalyticsController::class, 'cardsData']);
        Route::get('admin/analytics/report', [AdminAnalyticsController::class, 'report']);
        Route::get('admin/analytics/commerce', AdminCommerceInsightsController::class);
        Route::get('tracked-events', [TrackedEventsController::class, 'index']);

        Route::get('usage', UsageController::class);

        // KYC VERIFICATION
        Route::get('kyc/status', [KycVerificationsController::class, 'status']);
        Route::post('kyc', [KycVerificationsController::class, 'store']);
        Route::get('kyc/documents/{key}', [KycVerificationsController::class, 'document']);
        Route::get('admin/kyc-verifications', [AdminKycVerificationsController::class, 'index']);
        Route::get('admin/kyc-verifications/{kycVerification}', [AdminKycVerificationsController::class, 'show']);
        Route::post('admin/kyc-verifications/{kycVerification}/approve', [AdminKycVerificationsController::class, 'approve']);
        Route::post('admin/kyc-verifications/{kycVerification}/reject', [AdminKycVerificationsController::class, 'reject']);
        Route::get('admin/kyc-verifications/{kycVerification}/documents/{key}', [AdminKycVerificationsController::class, 'document']);
        Route::delete('admin/kyc-verifications/{kycVerification}', [AdminKycVerificationsController::class, 'destroy']);

        // TELEGRAM CREATOR NOTIFICATIONS
        Route::middleware('auth')->prefix('integrations/telegram')->group(function () {
            Route::get('/', [TelegramConnectionController::class, 'show']);
            Route::post('connect', [TelegramConnectionController::class, 'connect'])
                ->middleware('throttle:10,1');
            Route::delete('/', [TelegramConnectionController::class, 'disconnect']);
        });

        // BLOG (admin)
        Route::name('blog.')->prefix('blog')->group(function () {
            Route::apiResource('admin/articles', AdminBlogArticleController::class)->names('admin.articles');
            Route::apiResource('admin/categories', AdminBlogCategoryController::class)->names('admin.categories');
        });

        // SERVICE CATEGORIES (admin)
        Route::apiResource('admin/service-categories', AdminServiceCategoryController::class)
            ->parameters(['service-categories' => 'category'])
            ->names('admin.service-categories');
        Route::apiResource('admin/service-subcategories', AdminServiceSubcategoryController::class)
            ->parameters(['service-subcategories' => 'subcategory'])
            ->except(['show'])
            ->names('admin.service-subcategories');

        // CREATOR SERVICES
        // Auth is required: optionalAuth would let a guest through and the
        // controller would crash on a null user. Inquiry paths stay ahead of
        // the {service} resource so "inquiries" is not captured as an id.
        Route::middleware('auth')->group(function () {
            Route::get('services/inquiries', [ServiceInquiriesController::class, 'index']);
            Route::get('services/inquiries/{serviceInquiry}', [ServiceInquiriesController::class, 'show'])->whereNumber('serviceInquiry');
            Route::patch('services/inquiries/{serviceInquiry}', [ServiceInquiriesController::class, 'update'])->whereNumber('serviceInquiry');
            Route::delete('services/inquiries/{serviceInquiry}', [ServiceInquiriesController::class, 'destroy'])->whereNumber('serviceInquiry');
            Route::apiResource('services', CreatorServicesController::class)->parameters(['services' => 'service']);
        });

        // LINK
        Route::get('links', [LinksController::class, 'index']);
        Route::get('links/{id}', [LinksController::class, 'show']);
        Route::post('links', [LinksController::class, 'store']);
        Route::put('links/{id}', [LinksController::class, 'update']);
        Route::post('links/check-password', LinkPasswordController::class);
        Route::post('links/csv/export', [LinksController::class, 'exportCsv']);
        Route::post('links/bulk', [LinksController::class, 'bulkCreate']);
        Route::put('links/bulk', [LinksController::class, 'bulkUpdate']);
        Route::delete('links/bulk', [LinksController::class, 'bulkDelete']);
        Route::post('links/meta', LinkMetaTagsController::class);

        // FOLDERS
        Route::get('folders', [FoldersController::class, 'index']);
        Route::get('folders/{id}', [FoldersController::class, 'show']);
        Route::post('folders', [FoldersController::class, 'store']);
        Route::put('folders/{id}', [FoldersController::class, 'update']);
        Route::post('folders/{id}/links/attach', [FolderLinksController::class, 'attach']);
        Route::post('folders/{id}/links/detach', [FolderLinksController::class, 'detach']);
        Route::delete('folders/bulk', [FoldersController::class, 'bulkDelete']);
        Route::post('folders/bulk/archive', [FoldersController::class, 'bulkArchive']);
        Route::post('folders/bulk/unarchive', [FoldersController::class, 'bulkUnarchive']);
        Route::post('folders/csv/export', [FoldersController::class, 'exportCsv']);

        // STORES - canonical
        Route::get('stores/list', [StoresController::class, 'list'])->middleware('auth');
        Route::apiResource('stores', StoresController::class);
        Route::put('stores/{store}/creator-profile', [StoreCreatorProfileController::class, 'update']);
        Route::post('stores/{store}/creator-profile/convert', [StoreCreatorProfileController::class, 'convert']);
        Route::post('stores/{store}/change-order', [StoreContentOrderController::class, 'changeOrder']);
        Route::post('stores/{store}/appearance', [StoreAppearanceController::class, 'update']);
        Route::post('stores/{store}/link', [StoreLinkController::class, 'store']);
        Route::put('stores/{store}/link/{id}', [StoreLinkController::class, 'update']);
        Route::post('stores/{store}/link/{id}/detach', [StoreLinkController::class, 'detach']);
        Route::post('stores/{store}/widget', [StoreWidgetsController::class, 'store']);
        Route::put('stores/{store}/widget/{widgetId}', [StoreWidgetsController::class, 'update']);
        Route::delete('stores/{store}/widget/{widgetId}', [StoreWidgetsController::class, 'destroy']);

        // BIOLINKS - legacy with deprecation header
        Route::middleware('addDeprecationHeader')->group(function () {
            Route::get('biolink/list', [BiolinksController::class, 'list'])->middleware('auth');
            Route::put('biolinks/{id}/creator-profile', [CreatorProfileController::class, 'update']);
            Route::post('biolinks/{id}/creator-profile/convert', [CreatorProfileController::class, 'convert']);
            Route::post('biolink/{id}/change-order', [BiolinkContentOrderController::class, 'changeOrder']);
            Route::post('biolink/{id}/appearance', [BiolinkAppearanceController::class, 'update']);
            Route::post('biolink/{biolinkId}/link', [BiolinkLinkController::class, 'store']);
            Route::put('biolink/{biolinkId}/link/{id}', [BiolinkLinkController::class, 'update']);
            Route::post('biolink/{biolinkId}/link/{id}/detach', [BiolinkLinkController::class, 'detach']);
            Route::post('biolink/{biolinkId}/widget', [BiolinkWidgetsController::class, 'store']);
            Route::put('biolink/{biolinkId}/widget/{widgetId}', [BiolinkWidgetsController::class, 'update']);
            Route::delete('biolink/{biolinkId}/widget/{widgetId}', [BiolinkWidgetsController::class, 'destroy']);
            Route::apiResource('biolinks', BiolinksController::class)->parameters(['biolinks' => 'biolink']);
        });


        // LINK OVERLAY
        Route::get('link-overlays/{id}', [LinkOverlaysController::class, 'show']);
        Route::get('link-overlays', [LinkOverlaysController::class, 'index']);
        Route::post('link-overlays', [LinkOverlaysController::class, 'store']);
        Route::put('link-overlays/{id}', [LinkOverlaysController::class, 'update']);
        Route::delete('link-overlays/bulk', [LinkOverlaysController::class, 'bulkDelete']);
        Route::post('link-overlays/bulk/archive', [LinkOverlaysController::class, 'bulkArchive']);
        Route::post('link-overlays/bulk/unarchive', [LinkOverlaysController::class, 'bulkUnarchive']);

        // TRACKING PIXEL
        Route::get('tp/{id}', [TrackingPixelsController::class, 'show']);
        Route::get('tp', [TrackingPixelsController::class, 'index']);
        Route::post('tp', [TrackingPixelsController::class, 'store']);
        Route::put('tp/{id}', [TrackingPixelsController::class, 'update']);
        Route::delete('tp/bulk', [TrackingPixelsController::class, 'bulkDelete']);
        Route::post('tp/bulk/archive', [TrackingPixelsController::class, 'bulkArchive']);
        Route::post('tp/bulk/unarchive', [TrackingPixelsController::class, 'bulkUnarchive']);

        // LINK PAGES
        Route::get('link-pages', [LinkPagesController::class, 'index']);
        Route::get('link-pages/{id}', [LinkPagesController::class, 'show']);
        Route::post('link-pages', [LinkPagesController::class, 'store']);
        Route::put('link-pages/{id}', [LinkPagesController::class, 'update']);
        Route::delete('link-pages/bulk', [LinkPagesController::class, 'bulkDelete']);
        Route::post('link-pages/bulk/archive', [LinkPagesController::class, 'bulkArchive']);
        Route::post('link-pages/bulk/unarchive', [LinkPagesController::class, 'bulkUnarchive']);

        // QR CODES
        Route::get('qr-code', [QrCodesController::class, 'index']);
        Route::get('qr-code/{id}', [QrCodesController::class, 'show']);
        Route::post('qr-code', [QrCodesController::class, 'store']);
        Route::put('qr-code/{id}', [QrCodesController::class, 'update']);
        Route::delete('qr-codes/bulk', [QrCodesController::class, 'bulkDelete']);
        Route::post('qr-codes/bulk/archive', [QrCodesController::class, 'bulkArchive']);
        Route::post('qr-codes/bulk/unarchive', [QrCodesController::class, 'bulkUnarchive']);
        Route::post('qr-code/csv/export', [QrCodesController::class, 'exportCsv']);

        // TAGS
        Route::get('tags', [TagsController::class, 'index']);
        Route::post('tags', [TagsController::class, 'store']);
        Route::put('tags/{id}', [TagsController::class, 'update']);
        Route::delete('tags/bulk', [TagsController::class, 'bulkDelete']);

        // CUSTOM DOMAINS
        Route::get('custom-domains', [CustomDomainsController::class, 'index']);
        Route::get('custom-domains/{id}', [CustomDomainsController::class, 'show']);
        Route::post('custom-domains', [CustomDomainsController::class, 'store']);
        Route::put('custom-domains/{id}', [CustomDomainsController::class, 'update']);
        Route::delete('custom-domains/{id}', [CustomDomainsController::class, 'destroy']);
        Route::post('custom-domains/{id}/archive', [CustomDomainsController::class, 'archive']);
        Route::post('custom-domains/{id}/unarchive', [CustomDomainsController::class, 'unarchive']);

        // WEBHOOKS
        Route::get('webhooks', [WebhooksController::class, 'index']);
        Route::post('webhooks', [WebhooksController::class, 'store']);
        Route::get('webhooks/{id}', [WebhooksController::class, 'show']);
        Route::put('webhooks/{id}', [WebhooksController::class, 'update']);
        Route::delete('webhooks/{id}', [WebhooksController::class, 'destroy']);
        Route::get('webhooks/{id}/attempts', [WebhookAttemptsController::class, 'index']);
        Route::get('webhooks/{webhookId}/attempts/{attemptId}', [WebhookAttemptsController::class, 'show']);
        Route::post('webhooks/{id}/send-test-event', [
            WebhooksController::class,
            'sendTestEvent',
        ]);
        Route::post('webhooks/{id}/enable', [WebhooksController::class, 'enable']);
        Route::post('webhooks/{id}/disable', [WebhooksController::class, 'disable']);

        // WORKSPACE PAYOUT CONFIG
        Route::get('workspaces/{workspaceId}/payout-config', [WorkspacePayoutConfigController::class, 'show']);
        Route::post('workspaces/{workspaceId}/payout-config', [WorkspacePayoutConfigController::class, 'update']);

        // ADMIN WITHDRAWALS
        Route::get('admin/withdrawals', [AdminPayoutRequestsController::class, 'index'])->name('admin.withdrawals.index');
        Route::get('admin/withdrawals/{payoutRequest}/review', [AdminPayoutRequestsController::class, 'review'])->name('admin.withdrawals.review');
        Route::post('admin/withdrawals/{payoutRequest}/review', [AdminPayoutRequestsController::class, 'update'])->name('admin.withdrawals.update');
        Route::delete('admin/withdrawals/{payoutRequest}', [AdminPayoutRequestsController::class, 'destroy'])->name('admin.withdrawals.destroy');

        // ADMIN WITHDRAWAL METHODS
        Route::get('admin/financial/withdrawal-methods', [DigitalProductWithdrawalMethodsController::class, 'adminIndex'])->name('admin.withdrawal-methods.index');
        Route::post('admin/financial/withdrawal-methods', [DigitalProductWithdrawalMethodsController::class, 'store'])->name('admin.withdrawal-methods.store');
        Route::put('admin/financial/withdrawal-methods/{withdrawalMethod}', [DigitalProductWithdrawalMethodsController::class, 'update'])->name('admin.withdrawal-methods.update');
        Route::delete('admin/financial/withdrawal-methods/{withdrawalMethod}', [DigitalProductWithdrawalMethodsController::class, 'destroy'])->name('admin.withdrawal-methods.destroy');
    });
});
