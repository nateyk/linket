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
use App\Http\Controllers\LandingPageController;
use App\Kyc\Controllers\AdminKycVerificationsController;
use App\Kyc\Controllers\KycVerificationsController;
use App\Links\Controllers\LinksController;
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
use App\Webhooks\Controllers\WebhookAttemptsController;
use App\Webhooks\Controllers\WebhooksController;
use App\Tags\Controllers\TagsController;
use Common\Domains\CustomDomainsController;
use Illuminate\Support\Facades\Route;

Route::group(['prefix' => 'v1'], function() {

    // LANDING
    Route::get('landing-page-data', [LandingPageController::class, 'show']);

    Route::group(['middleware' => ['optionalAuth:sanctum', 'verified', 'verifyApiAccess']], function () {
        Route::get('tracked-events/report', [TrackedEventsController::class, 'report']);
        Route::get('admin/analytics/cards-data', [AdminAnalyticsController::class, 'cardsData']);
        Route::get('admin/analytics/report', [AdminAnalyticsController::class, 'report']);
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

        // BIOLINKS
        Route::get('biolink/list', [BiolinksController::class, 'list'])->middleware('auth');
        Route::get('biolinks', [BiolinksController::class, 'index']);
        Route::get('biolinks/{id}', [BiolinksController::class, 'show']);
        Route::post('biolinks', [BiolinksController::class, 'store']);
        Route::put('biolinks/{id}', [BiolinksController::class, 'update']);
        Route::delete('biolinks/{id}', [BiolinksController::class, 'destroy']);
        Route::put('biolinks/{id}/creator-profile', [CreatorProfileController::class, 'update']);
        Route::post('biolinks/{id}/creator-profile/convert', [CreatorProfileController::class, 'convert']);
        Route::post('biolink/{id}/change-order', [BiolinkContentOrderController::class, 'changeOrder']);
        Route::post('biolink/{id}/appearance', [BiolinkAppearanceController::class, 'update']);

        // BIOLINK LINKS
        Route::post('biolink/{biolinkId}/link', [BiolinkLinkController::class, 'store']);
        Route::put('biolink/{biolinkId}/link/{id}', [BiolinkLinkController::class, 'update']);
        Route::post('biolink/{biolinkId}/link/{id}/detach', [BiolinkLinkController::class, 'detach']);

        // BIOLINK WIDGETS
        Route::post('biolink/{biolinkId}/widget', [BiolinkWidgetsController::class, 'store']);
        Route::put('biolink/{biolinkId}/widget/{widgetId}', [BiolinkWidgetsController::class, 'update']);
        Route::delete('biolink/{biolinkId}/widget/{widgetId}', [BiolinkWidgetsController::class, 'destroy']);


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
    });
});
