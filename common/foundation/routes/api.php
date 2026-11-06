<?php

use Common\Admin\SiteAlertsController;
use Common\Admin\CacheController;
use Common\Admin\ImpersonateUserController;
use Common\Admin\Sitemap\SitemapController;
use Common\Auth\Controllers\AccessTokenController;
use Common\Auth\Controllers\BanUsersController;
use Common\Auth\Controllers\MobileAuthController;
use Common\Permissions\Controllers\PermissionsController;
use Common\Auth\Controllers\SocialAuthController;
use Common\Auth\Controllers\FollowedUsersController;
use Common\Auth\Controllers\FollowersController;
use Common\Auth\Controllers\UserSessionsController;
use Common\Auth\Middleware\VerifyApiAccessMiddleware;
use Common\Roles\Controllers\RoleUsersController;
use Common\Roles\Controllers\RolesController;
use Common\Billing\Gateways\Paypal\PaypalController;
use Common\Billing\Gateways\Stripe\StripeController;
use Common\Billing\Gateways\Chapa\ChapaController;
use Common\Billing\Products\ProductsController;
use Common\Billing\Subscriptions\SubscriptionsController;
use Common\Comments\Controllers\CommentableController;
use Common\Comments\Controllers\CommentController;
use Common\Core\Controllers\BootstrapController;
use Common\Core\Values\ValueListsController;
use Common\Files\Controllers\AddPreviewTokenController;
use Common\Files\Controllers\DownloadFileController;
use Common\Files\Controllers\FileEntriesController;
use Common\Files\Controllers\RestoreDeletedEntriesController;
use Common\Files\Controllers\ValidateBackendCredentialsController;
use Common\Files\S3\S3CorsController;
use Common\Files\S3\S3FileEntryController;
use Common\Files\S3\S3MultipartUploadController;
use Common\Files\S3\S3SimpleUploadController;
use Common\Files\Tus\TusFileEntryController;
use Common\Files\Tus\TusServerController;
use Common\Images\UnsplashImagesController;
use Common\Localizations\LocalizationsController;
use Common\Localizations\UserLocaleController;
use Common\Logging\Error\ErrorLogController;
use Common\Logging\Mail\OutgoingEmailLogController;
use Common\Logging\Schedule\ScheduleLogController;
use Common\Notifications\Controllers\NotificationController;
use Common\Notifications\Controllers\NotificationSubscriptionsController;
use Common\Pages\ContactPageController;
use Common\Pages\CustomPageController;
use Common\Reports\ReportController;
use Common\Core\Middleware\VerifyCsrfToken;
use Common\Core\Middleware\EnsureFrontendRequestsAreStateful;
use Common\Search\Controllers\NormalizedModelsController;
use Common\Search\Controllers\SearchSettingsController;
use Common\Settings\Manager\SettingsController;
use Common\Users\Controllers\AccountSettingsController;
use Common\Users\Controllers\UsersController;
use Common\Votes\VoteController;
use Common\Workspaces\Controllers\WorkspacesController;
use Common\Workspaces\Controllers\WorkspaceInvitesController;
use Common\Workspaces\Controllers\WorkspaceMembersController;
use App\Storefront\Controllers\AdminDigitalProductsController;
use App\Storefront\Controllers\DigitalProductsController;
use App\Storefront\Controllers\PayoutRequestsController;
use App\Storefront\Controllers\StorefrontSalesController;
use App\Storefront\Controllers\StorefrontCheckoutController;
use App\Storefront\Controllers\OrderPaymentController;
use App\Storefront\Controllers\CreatorPaymentMethodsController;
use App\Storefront\Controllers\CreatorOrdersController;
use App\Storefront\Controllers\AdminDirectOrdersController;
use App\Payments\Controllers\DirectBillingController;
use App\Payments\Controllers\AdminPlanManagementController;
use App\Storefront\Controllers\DigitalProductPayoutMethodController;
use App\Storefront\Controllers\DigitalProductWithdrawalMethodsController;
use App\Storefront\Controllers\AdminDigitalProductRefundsController;
use App\Storefront\Controllers\PublicDigitalProductSampleController;
use App\Storefront\Controllers\PublicDigitalProductsController;
use App\Payments\Controllers\AdminPaymentTransactionsController;
use App\Payments\Controllers\AdminPaymentHealthController;
use App\Storefront\Controllers\CustomerOrderPortalController;
use App\Storefront\Controllers\PaymentDisputeController;
use App\Storefront\Controllers\AdminDigitalProductOrderRecoveryDeliveriesController;
use App\Storefront\Controllers\ProductReviewsController;
use App\Storefront\Controllers\CreatorProductReviewsController;
use App\Storefront\Controllers\AdminProductReviewsController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Http\Controllers\PasswordResetLinkController;

// prettier-ignore
Route::group(['prefix' => 'v1'], function () {
    Route::group(['middleware' => ['optionalAuth:sanctum', 'verified', 'verifyApiAccess']], function () {
        // FILE ENTRIES
        Route::get('file-entries/{fileEntry}/model', [FileEntriesController::class, 'showModel']);
        Route::get('file-entries/{fileEntry}', [FileEntriesController::class, 'show'])
          ->withoutMiddleware(VerifyApiAccessMiddleware::class);
        Route::get('file-entries', [FileEntriesController::class, 'index']);
        Route::post('file-entries', [FileEntriesController::class, 'store']);
        Route::put('file-entries/{id}', [FileEntriesController::class, 'update']);
        Route::post('file-entries/bulk-delete', [FileEntriesController::class, 'bulkDelete']);
        Route::get('file-entries/download/{hashes}', [DownloadFileController::class, 'download']);
        Route::post('file-entries/restore', [RestoreDeletedEntriesController::class, 'restore']);
        Route::post('file-entries/{id}/add-preview-token', [AddPreviewTokenController::class, 'store']);

        // S3 UPLOADS
        Route::post('s3/multipart/create', [S3MultipartUploadController::class, 'create']);
        Route::post('s3/multipart/batch-sign-part-urls', [S3MultipartUploadController::class, 'batchSignPartUrls']);
        Route::post('s3/multipart/get-uploaded-parts', [S3MultipartUploadController::class, 'getUploadedParts']);
        Route::post('s3/multipart/complete', [S3MultipartUploadController::class, 'complete']);
        Route::post('s3/multipart/abort', [S3MultipartUploadController::class, 'abort']);
        Route::post('s3/simple/presign', [S3SimpleUploadController::class, 'presignPost']);
        Route::post('s3/entries', [S3FileEntryController::class, 'store']);
        Route::post('s3/cors/upload', [S3CorsController::class, 'uploadCors']);

        // TUS UPLOADS
        Route::post('tus/entries', [TusFileEntryController::class, 'store']);
        Route::any('/tus/upload/{any?}', TusServerController::class)->where('any', '.*');

        // NOTIFICATIONS
        Route::get('notifications', [NotificationController::class, 'index']);
        Route::delete('notifications/bulk', [NotificationController::class, 'bulkDelete']);
        Route::post('notifications/mark-as-read', [NotificationController::class, 'markAsRead']);
        Route::get('notifications/subscriptions', [NotificationSubscriptionsController::class, 'index']);
        Route::put('notifications/subscriptions', [NotificationSubscriptionsController::class, 'update']);

        //ROLES
        Route::get('roles/{id}/users', [RoleUsersController::class, 'index']);
        Route::post('roles/{id}/users/add', [RoleUsersController::class, 'addUsers']);
        Route::post('roles/{id}/users/remove', [RoleUsersController::class, 'removeUsers']);
        Route::get('roles', [RolesController::class, 'index']);
        Route::get('roles/{id}', [RolesController::class, 'show']);
        Route::post('roles', [RolesController::class, 'store']);
        Route::put('roles/{id}', [RolesController::class, 'update']);
        Route::delete('roles/{id}', [RolesController::class, 'destroy']);
        Route::post('roles/csv/export', [RolesController::class, 'exportCsv']);
        Route::get('permissions', [PermissionsController::class, 'index']);

        //USERS
        Route::get('account-settings', AccountSettingsController::class);
        Route::get('users', [UsersController::class, 'index']);
        Route::get('users/{id}', [UsersController::class, 'show'])->withoutMiddleware('verified');
        Route::post('users', [UsersController::class, 'store']);
        Route::put('users/{id}', [UsersController::class, 'update']);
        Route::delete('users/bulk', [UsersController::class, 'bulkeDelete']);
        Route::post('access-tokens', [AccessTokenController::class, 'store']);
        Route::delete('access-tokens/{tokenId}', [AccessTokenController::class, 'destroy']);
        Route::post('users/csv/export', [UsersController::class, 'exportCsv']);
        Route::get('users/{user}/followers', [FollowersController::class, 'index']);
        Route::post('users/{user}/follow', [FollowersController::class, 'follow']);
        Route::post('users/{user}/unfollow', [FollowersController::class, 'unfollow']);
        Route::get('users/{user}/followed-users', [FollowedUsersController::class, 'index']);
        Route::get('users/{user}/followed-users/ids', [FollowedUsersController::class, 'ids']);

        // USER BANS
        Route::post('users/ban/{userIds}', [BanUsersController::class, 'store']);
        Route::delete('users/unban/{userIds}', [BanUsersController::class, 'destroy']);

        // USER SESSIONS
        Route::get('user-sessions', [UserSessionsController::class, 'index'])->middleware('auth');
        Route::post('user-sessions/logout-other', [UserSessionsController::class, 'LogoutOtherSessions'])->middleware(['auth', 'password.confirm']);

        // WORKSPACES
        Route::get('workspaces', [WorkspacesController::class, 'index']);
        Route::get('workspaces/{id}', [WorkspacesController::class, 'show']);
        Route::post('workspaces', [WorkspacesController::class, 'store']);
        Route::put('workspaces/{id}', [WorkspacesController::class, 'update']);
        Route::delete('workspaces/{id}', [WorkspacesController::class, 'destroy']);
        Route::get('workspace/{id}/members', [WorkspaceMembersController::class, 'index']);
        Route::get('workspace/{id}/invites', [WorkspaceInvitesController::class, 'index']);
        Route::delete('workspace/{id}/member/{userId}', [WorkspaceMembersController::class, 'destroy']);
        Route::post('workspace/{id}/invite', [WorkspaceInvitesController::class, 'store']);
        Route::post('workspace/{id}/{inviteId}/resend', [WorkspaceInvitesController::class, 'resend']);
        Route::post('workspace/{id}/member/{memberId}/change-role', [WorkspaceMembersController::class, 'changeRole']);
        Route::post('workspace/{id}/invite/{inviteId}/change-role', [WorkspaceInvitesController::class, 'changeRole']);
        Route::delete('workspace/invite/{inviteId}', [WorkspaceInvitesController::class, 'destroy']);
        Route::get('workspace/join/{inviteId}', [WorkspaceMembersController::class, 'join']);

        // SETTINGS
        Route::get('settings', [SettingsController::class, 'index']);
        Route::get('settings/seo-tags', [SettingsController::class, 'loadSeoTags']);
        Route::get('settings/menu-editor-config', [SettingsController::class, 'loadMenuEditorConfig']);
        Route::post('settings', [SettingsController::class, 'update']);
        Route::put('settings/uploading/validate-backend-credentials', ValidateBackendCredentialsController::class);

        // SITEMAP
        Route::post('sitemap/generate', [SitemapController::class, 'generate']);

        // CUSTOM PAGES
        Route::apiResource('custom-pages', CustomPageController::class);

        // COMMENTS
        Route::apiResource('comment', CommentController::class);
        Route::post('comment/restore', [CommentController::class, 'restore']);
        Route::get('commentable/comments', [CommentableController::class, 'index']);

        // VOTES
        Route::post('vote', [VoteController::class, 'store']);

        // REPORTS
        Route::post('report', [ReportController::class, 'store']);
        Route::delete('report/{modelType}/{modelId}', [ReportController::class, 'destroy']);

        // CONTACT PAGE
        Route::post('contact-page', [ContactPageController::class, 'sendMessage']);

        // SEARCH
        Route::get('normalized-models/{modelType}', [NormalizedModelsController::class, 'index']);
        Route::get('normalized-models/{modelType}/{modelId}', [NormalizedModelsController::class, 'show']);

        // PRODUCTS
        Route::apiResource('billing/products', ProductsController::class);
        Route::post('billing/products/sync', [ProductsController::class, 'syncProducts']);
        Route::get('admin/billing/products/{product}/subscribers', [AdminPlanManagementController::class, 'subscribers']);
        Route::get('admin/billing/products/{product}/audit', [AdminPlanManagementController::class, 'audit']);

        // SUBSCRIPTIONS
        Route::get('billing/subscriptions', [SubscriptionsController::class, 'index']);
        Route::post('billing/subscriptions', [SubscriptionsController::class, 'store']);
        Route::post('billing/subscriptions/{id}/cancel', [SubscriptionsController::class, 'cancel']);
        Route::put('billing/subscriptions/{id}', [SubscriptionsController::class, 'update']);
        Route::post('billing/subscriptions/{id}/resume', [SubscriptionsController::class, 'resume']);
        Route::post('billing/subscriptions/{id}/change-plan', [SubscriptionsController::class, 'changePlan']);
        Route::post('billing/stripe/create-partial-subscription', [StripeController::class, 'createPartialSubscription']);
        Route::post('billing/stripe/create-setup-intent', [StripeController::class, 'createSetupIntent']);
        Route::post('billing/stripe/change-default-payment-method', [StripeController::class, 'changeDefaultPaymentMethod']);
        Route::post('billing/stripe/store-subscription-details-locally', [StripeController::class, 'storeSubscriptionDetailsLocally']);
        Route::post('billing/paypal/store-subscription-details-locally', [PaypalController::class, 'storeSubscriptionDetailsLocally']);
        Route::post('billing/chapa/checkout', [ChapaController::class, 'checkout'])->middleware('throttle:10,1');
        Route::get('billing/direct', [DirectBillingController::class, 'index'])->middleware('auth:sanctum');
        Route::get('billing/direct/pro/{payment}/receipt', [DirectBillingController::class, 'downloadProReceipt'])->middleware('auth:sanctum');
        Route::post('billing/direct/pro', [DirectBillingController::class, 'startPro'])->middleware(['auth:sanctum', 'throttle:10,1']);
        Route::post('billing/direct/pro/{payment}/reference', [DirectBillingController::class, 'submitProReference'])->middleware(['auth:sanctum', 'throttle:10,1']);
        Route::post('billing/direct/invoices/{invoice}/reference', [DirectBillingController::class, 'submitInvoiceReference'])->middleware(['auth:sanctum', 'throttle:10,1']);
        Route::get('billing/chapa/transactions/{txRef}', [ChapaController::class, 'status'])->middleware('throttle:60,1');

        // CREATOR AI: deny by default, independently authorized per service.
        // Settings can be read/changed only by an admin with settings.update.
        // Credentials are write-only; all responses are private and no-store.
        Route::get('admin/creator-ai/settings', [\App\CreatorAi\Controllers\AdminCreatorAiSettingsController::class, 'show'])
            ->middleware(['auth:sanctum', 'throttle:20,1']);
        Route::patch('admin/creator-ai/settings', [\App\CreatorAi\Controllers\AdminCreatorAiSettingsController::class, 'update'])
            ->middleware(['auth:sanctum', 'throttle:10,1']);
        Route::get('creator-ai/usage', [\App\CreatorAi\Controllers\CreatorAiUsageController::class, 'show'])
            ->middleware(['auth:sanctum', 'throttle:30,1']);
        Route::get('creator-ai/stores/{store}/appearance-availability', [\App\CreatorAi\Controllers\CreatorStorefrontAppearancePreviewController::class, 'availability'])
            ->middleware(['auth:sanctum', 'throttle:20,1']);
        // PR-09: Pro-only storefront appearance preview, never an update route.
        Route::get('creator-ai/stores/{store}/appearance-preview', [\App\CreatorAi\Controllers\CreatorStorefrontAppearancePreviewController::class, 'show'])
            ->middleware(['auth:sanctum', 'throttle:20,1']);
        Route::post('creator-ai/stores/{store}/appearance-revision', [\App\CreatorAi\Controllers\CreatorStorefrontAppearancePreviewController::class, 'verifyRevision'])
            ->middleware(['auth:sanctum', 'throttle:20,1']);
        Route::get('creator-ai/products/{digitalProduct}/copy-availability', [\App\CreatorAi\Controllers\CreatorProductCopyController::class, 'availability'])
            ->middleware(['auth:sanctum', 'throttle:20,1']);
        Route::post('creator-ai/products/{digitalProduct}/copy-proposals', [\App\CreatorAi\Controllers\CreatorProductCopyController::class, 'propose'])
            ->middleware(['auth:sanctum', 'throttle:5,1']);
        Route::post('creator-ai/products/{digitalProduct}/copy-revision', [\App\CreatorAi\Controllers\CreatorProductCopyController::class, 'validateRevision'])
            ->middleware(['auth:sanctum', 'throttle:20,1']);
        Route::get('creator-ai/products/{digitalProduct}/copy-drafts/{draftId?}', [\App\CreatorAi\Controllers\CreatorProductCopyController::class, 'show'])
            ->whereUuid('draftId')->middleware(['auth:sanctum', 'throttle:30,1']);
        Route::patch('creator-ai/products/{digitalProduct}/copy-drafts/{draftId}', [\App\CreatorAi\Controllers\CreatorProductCopyController::class, 'review'])
            ->whereUuid('draftId')->middleware(['auth:sanctum', 'throttle:30,1']);
        Route::post('creator-ai/products/{digitalProduct}/copy-drafts/{draftId}/discard', [\App\CreatorAi\Controllers\CreatorProductCopyController::class, 'discard'])
            ->whereUuid('draftId')->middleware(['auth:sanctum', 'throttle:30,1']);
        // MCP connection management does not issue OAuth credentials.
        // The future consent callback is a separate, Passport-protected flow.
        Route::get('creator-ai/mcp-connections', [\App\CreatorAi\Controllers\CreatorMcpConnectionsController::class, 'index'])
            ->middleware(['auth:sanctum', 'throttle:20,1']);
        Route::delete('creator-ai/mcp-connections/{connectionId}', [\App\CreatorAi\Controllers\CreatorMcpConnectionsController::class, 'destroy'])
            ->whereUuid('connectionId')
            ->middleware(['auth:sanctum', 'throttle:20,1']);
        Route::get('creator-ai/sales-summary', [\App\CreatorAi\Controllers\CreatorAiReportsController::class, 'salesSummary'])
            ->middleware(['auth:sanctum', 'throttle:30,1']);
        Route::get('creator-ai/order-insights', [\App\CreatorAi\Controllers\CreatorAiReportsController::class, 'orderInsights'])
            ->middleware(['auth:sanctum', 'throttle:30,1']);
        Route::get('creator-ai/product-performance', [\App\CreatorAi\Controllers\CreatorAiReportsController::class, 'productPerformance'])
            ->middleware(['auth:sanctum', 'throttle:30,1']);

        // CREATOR STOREFRONT
        Route::post('storefront/products/{digitalProduct}/duplicate', [DigitalProductsController::class, 'duplicate']);
        Route::post('storefront/products/{digitalProduct}/archive', [DigitalProductsController::class, 'archive']);
        Route::post('storefront/products/{digitalProduct}/unarchive', [DigitalProductsController::class, 'unarchive']);
        Route::apiResource('storefront/products', DigitalProductsController::class)
            ->names('storefront.products');
        Route::get('storefront/payment-methods', [CreatorPaymentMethodsController::class, 'index'])->middleware('auth:sanctum');
        Route::get('storefront/payment-methods/{method}/details', [CreatorPaymentMethodsController::class, 'details'])->middleware(['auth:sanctum', 'throttle:20,1']);
        Route::post('storefront/payment-methods', [CreatorPaymentMethodsController::class, 'store'])->middleware('auth:sanctum');
        Route::post('storefront/payment-methods/{method}/deactivate', [CreatorPaymentMethodsController::class, 'deactivate'])->middleware('auth:sanctum');
        Route::post('storefront/payment-methods/{method}/resubmit', [CreatorPaymentMethodsController::class, 'resubmit'])->middleware('auth:sanctum');
        Route::post('storefront/payment-methods/{method}/activate', [CreatorPaymentMethodsController::class, 'activate'])->middleware('auth:sanctum');
        Route::post('storefront/payment-methods/{method}/alias', [CreatorPaymentMethodsController::class, 'requestAlias'])->middleware('auth:sanctum');
        Route::get('storefront/direct-orders', [CreatorOrdersController::class, 'index'])->middleware('auth:sanctum');
        Route::get('storefront/direct-orders/transactions', [CreatorOrdersController::class, 'transactions'])->middleware('auth:sanctum');
        Route::get('storefront/direct-orders/{order}', [CreatorOrdersController::class, 'show'])->middleware('auth:sanctum');
        Route::get('storefront/direct-orders/{order}/disputes', [PaymentDisputeController::class, 'creatorIndex'])->middleware('auth:sanctum');
        Route::patch('storefront/direct-orders/{order}/disputes/{dispute}', [PaymentDisputeController::class, 'creatorUpdate'])->middleware('auth:sanctum');
        Route::post('storefront/direct-orders/{order}/manual-approve', [CreatorOrdersController::class, 'manualApprove'])->middleware('auth:sanctum');
        Route::get('admin/storefront/direct-orders', [AdminDirectOrdersController::class, 'index'])->middleware('auth:sanctum');
        Route::post('admin/storefront/direct-orders/{order}/approve', [AdminDirectOrdersController::class, 'approve'])->middleware('auth:sanctum');
        Route::get('admin/storefront/payment-disputes', [PaymentDisputeController::class, 'adminIndex'])->middleware('auth:sanctum');
        Route::get('admin/storefront/payment-disputes/{dispute}', [PaymentDisputeController::class, 'adminShow'])->middleware('auth:sanctum');
        Route::patch('admin/storefront/payment-disputes/{dispute}', [PaymentDisputeController::class, 'adminUpdate'])->middleware('auth:sanctum');
        Route::get('admin/storefront/creators/overview', [\App\Storefront\Controllers\AdminCreatorManagementController::class, 'overview'])->middleware('auth:sanctum');
        Route::get('admin/storefront/creators', [\App\Storefront\Controllers\AdminCreatorManagementController::class, 'index'])->middleware('auth:sanctum');
        Route::get('admin/storefront/creators/{user}/sales', [\App\Storefront\Controllers\AdminCreatorManagementController::class, 'sales'])->middleware('auth:sanctum');
        Route::get('admin/storefront/creators/{user}', [\App\Storefront\Controllers\AdminCreatorManagementController::class, 'show'])->middleware('auth:sanctum');
        Route::get('admin/storefront/payment-methods', [CreatorPaymentMethodsController::class, 'adminIndex'])->middleware('auth:sanctum');
        Route::get('admin/storefront/payment-methods/{method}', [CreatorPaymentMethodsController::class, 'adminShow'])->middleware('auth:sanctum');
        Route::get('admin/storefront/verify-et-settings', [\App\Payments\Controllers\AdminVerifyEtSettingsController::class, 'show'])->middleware('auth:sanctum');
        Route::patch('admin/storefront/verify-et-settings', [\App\Payments\Controllers\AdminVerifyEtSettingsController::class, 'update'])->middleware('auth:sanctum');
        Route::get('admin/storefront/payment-method-catalog', [CreatorPaymentMethodsController::class, 'catalog'])->middleware('auth:sanctum');
        Route::patch('admin/storefront/payment-method-catalog/{paymentMethod}', [CreatorPaymentMethodsController::class, 'updateCatalog'])->middleware('auth:sanctum');
        Route::post('admin/storefront/payment-methods/{method}/approve', [CreatorPaymentMethodsController::class, 'approve'])->middleware('auth:sanctum');
        Route::post('admin/storefront/payment-methods/{method}/provider-registration', [CreatorPaymentMethodsController::class, 'recordProviderRegistration'])->middleware('auth:sanctum');
        Route::post('admin/storefront/payment-methods/{method}/suspend', [CreatorPaymentMethodsController::class, 'suspend'])->middleware('auth:sanctum');
        Route::post('admin/storefront/payment-methods/{method}/restore', [CreatorPaymentMethodsController::class, 'restore'])->middleware('auth:sanctum');
        Route::post('admin/storefront/payment-methods/{method}/reject', [CreatorPaymentMethodsController::class, 'reject'])->middleware('auth:sanctum');
        Route::post('admin/storefront/payment-methods/{method}/approve-alias', [CreatorPaymentMethodsController::class, 'approveAlias'])->middleware('auth:sanctum');
        Route::get('admin/storefront/payment-methods/{method}/proof', [CreatorPaymentMethodsController::class, 'proof'])->middleware('auth:sanctum');
        Route::post('storefront/products/{digitalProduct}/submit', [DigitalProductsController::class, 'submit']);
        Route::get('storefront/payout-requests', [PayoutRequestsController::class, 'index']);
        Route::post('storefront/payout-requests', [PayoutRequestsController::class, 'store']);
        Route::get('storefront/sales', [StorefrontSalesController::class, 'index']);
        Route::get('admin/storefront/products', [AdminDigitalProductsController::class, 'index']);
        Route::post('admin/storefront/products/{digitalProduct}/approve', [AdminDigitalProductsController::class, 'approve']);
        Route::post('admin/storefront/products/{digitalProduct}/reject', [AdminDigitalProductsController::class, 'reject']);
        Route::get('admin/storefront/payout-requests', [PayoutRequestsController::class, 'adminIndex']);
        Route::post('admin/storefront/payout-requests/{payoutRequest}/mark-paid', [PayoutRequestsController::class, 'markPaid']);

        // DIGITAL PRODUCTS (preferred public interface; storefront aliases remain for compatibility)
        Route::get('items/sales', [StorefrontSalesController::class, 'index']);
        Route::get('items/payout-requests', [PayoutRequestsController::class, 'index']);
        Route::post('items/payout-requests', [PayoutRequestsController::class, 'store']);
        Route::post('items/payout-requests/{payoutRequest}/cancel', [PayoutRequestsController::class, 'cancel']);
        Route::get('items/withdrawal-methods', [DigitalProductWithdrawalMethodsController::class, 'index']);
        Route::get('items/payout-method', [DigitalProductPayoutMethodController::class, 'show']);
        Route::put('items/payout-method', [DigitalProductPayoutMethodController::class, 'update']);
        Route::apiResource('items', DigitalProductsController::class)->parameters(['items' => 'digitalProduct']);
        Route::get('items/{digitalProduct}/reviews', [CreatorProductReviewsController::class, 'index']);
        Route::post('items/{digitalProduct}/submit', [DigitalProductsController::class, 'submit']);
        Route::post('items/{digitalProduct}/duplicate', [DigitalProductsController::class, 'duplicate']);
        Route::post('items/{digitalProduct}/archive', [DigitalProductsController::class, 'archive']);
        Route::post('items/{digitalProduct}/unarchive', [DigitalProductsController::class, 'unarchive']);
        Route::put('items/{digitalProduct}/draft', [DigitalProductsController::class, 'saveDraft']);
        Route::get('admin/items', [AdminDigitalProductsController::class, 'index']);
        Route::get('admin/items/{digitalProduct}', [AdminDigitalProductsController::class, 'show'])->whereNumber('digitalProduct');
        Route::get('admin/items/{digitalProduct}/files/{fileEntry}', [AdminDigitalProductsController::class, 'downloadFile'])->whereNumber(['digitalProduct', 'fileEntry']);
        Route::post('admin/items/{digitalProduct}/approve', [AdminDigitalProductsController::class, 'approve']);
        Route::post('admin/items/{digitalProduct}/reject', [AdminDigitalProductsController::class, 'reject']);
        Route::post('admin/items/{digitalProduct}/re-review', [AdminDigitalProductsController::class, 'reReview']);
        Route::post('admin/items/bulk-approve', [AdminDigitalProductsController::class, 'bulkApprove']);
        Route::post('admin/items/bulk-reject', [AdminDigitalProductsController::class, 'bulkReject']);
        Route::get('admin/items/payout-requests', [PayoutRequestsController::class, 'adminIndex']);
        Route::post('admin/items/payout-requests/{payoutRequest}/processing', [PayoutRequestsController::class, 'startProcessing']);
        Route::post('admin/items/payout-requests/{payoutRequest}/reject', [PayoutRequestsController::class, 'reject']);
        Route::post('admin/items/payout-requests/{payoutRequest}/reveal-destination', [PayoutRequestsController::class, 'revealDestination']);
        Route::post('admin/items/payout-requests/{payoutRequest}/mark-paid', [PayoutRequestsController::class, 'markPaid']);
        Route::get('admin/items/withdrawal-methods', [DigitalProductWithdrawalMethodsController::class, 'adminIndex']);
        Route::post('admin/items/withdrawal-methods', [DigitalProductWithdrawalMethodsController::class, 'store']);
        Route::put('admin/items/withdrawal-methods/{withdrawalMethod}', [DigitalProductWithdrawalMethodsController::class, 'update']);
        Route::get('admin/payment-transactions', [AdminPaymentTransactionsController::class, 'index']);
        Route::get('admin/items/order-recovery-deliveries', [AdminDigitalProductOrderRecoveryDeliveriesController::class, 'index']);
        Route::get('admin/items/{digitalProduct}/reviews', [AdminProductReviewsController::class, 'index']);
        Route::post('admin/items/reviews/{productReview}/hide', [AdminProductReviewsController::class, 'hide']);
        Route::post('admin/items/reviews/{productReview}/unhide', [AdminProductReviewsController::class, 'unhide']);
        Route::delete('admin/items/reviews/{productReview}', [AdminProductReviewsController::class, 'destroy']);
        Route::post('admin/payment-transactions/{paymentTransaction}/refunds', [AdminDigitalProductRefundsController::class, 'store']);
        Route::get('admin/payment-health', [AdminPaymentHealthController::class, 'index']);
        Route::post('admin/payment-health/test-email', [AdminPaymentHealthController::class, 'sendTestEmail']);

        // ADMIN
        Route::get('settings/server-max-file-size', [SettingsController::class, 'getServerMaxUploadSize']);
        Route::get('admin/site-alerts', [SiteAlertsController::class, 'index']);
        Route::post('cache/flush', [CacheController::class, 'flush']);
        Route::post('admin/users/impersonate/{userId}', [ImpersonateUserController::class, 'impersonate']);
        Route::get('admin/search/models', [SearchSettingsController::class, 'getSearchableModels']);
        Route::post('admin/search/import', [SearchSettingsController::class, 'import']);

        // LOCALIZATIONS
        Route::post('localizations', [LocalizationsController::class, 'store']);
        Route::put('localizations/{langCode}', [LocalizationsController::class, 'update']);
        Route::delete('localizations/{id}', [LocalizationsController::class, 'destroy']);
        Route::get('localizations/{id}/download', [LocalizationsController::class, 'download']);
        Route::post('localizations/{id}/upload', [LocalizationsController::class, 'upload']);
        Route::post('users/me/locale', [UserLocaleController::class, 'update']);
        Route::get('localizations', [LocalizationsController::class, 'index']);
        Route::get('localizations/{id}', [LocalizationsController::class, 'show']);

        // VALUE LISTS
        Route::get('value-lists/{names}', [ValueListsController::class, 'index'])->withoutMiddleware('verified');

        // SCHEDULE LOG
        Route::get('logs/schedule', [ScheduleLogController::class, 'index']);
        Route::post('logs/schedule/rerun/{id}', [ScheduleLogController::class, 'rerun']);
        Route::get('logs/schedule/download', [ScheduleLogController::class, 'download']);

        // OUTGOING EMAIL LOG
        Route::get('logs/outgoing-email/download', [OutgoingEmailLogController::class, 'downloadLog']);
        Route::get('logs/outgoing-email/{id}', [OutgoingEmailLogController::class, 'show']);
        Route::get('logs/outgoing-email', [OutgoingEmailLogController::class, 'index']);
        Route::get('logs/outgoing-email/{id}/download', [OutgoingEmailLogController::class, 'downloadLogItem']);

        // ERROR LOG
        Route::get('logs/error', [ErrorLogController::class, 'index']);
        Route::get('logs/error/{identifier}/download', [ErrorLogController::class, 'download']);
        Route::delete('logs/error/{identifier}', [ErrorLogController::class, 'destroy']);

        // IMAGES
        Route::get('images/unsplash', [UnsplashImagesController::class, 'index']);
        Route::post('images/unsplash/{id}/download', [UnsplashImagesController::class, 'trackDownload']);

        // BOOTSTRAP
        Route::get('bootstrap-data', [BootstrapController::class, 'getBootstrapData']);
        Route::get('remote-config/mobile', [BootstrapController::class, 'getMobileBootstrapData'])->withoutMiddleware('verifyApiAccess');

        $verificationLimiter = config('fortify.limiters.verification', '6,1');
        Route::post('auth/email/verification-notification', [MobileAuthController::class, 'sendEmailVerificationNotification'])->middleware(['throttle:'.$verificationLimiter]);
    });

    // Mobile app auth
    $limiter = config('fortify.limiters.login');
    Route::post('auth/login', [MobileAuthController::class, 'login'])->middleware(array_filter([
        $limiter ? 'throttle:'.$limiter : null,
    ]))->withoutMiddleware('verifyApiAccess');
    Route::post('auth/register', [MobileAuthController::class, 'register'])->withoutMiddleware('verifyApiAccess');
    Route::get('auth/social/{provider}/callback', [SocialAuthController::class, 'loginCallback']);
    Route::post('auth/password/email', [PasswordResetLinkController::class, 'store'])->middleware(['guest:'.config('fortify.guard')]);
    Route::get('public/biolinks/{biolink}/digital-products', [PublicDigitalProductsController::class, 'index']);
    Route::get('public/biolinks/{biolink}/digital-products/{digitalProduct}', [PublicDigitalProductsController::class, 'show']);
    Route::post('public/biolinks/{biolink}/digital-products/{digitalProduct}/checkout', [PublicDigitalProductsController::class, 'checkout'])
        ->middleware('throttle:20,1')
        ->withoutMiddleware([
            EnsureFrontendRequestsAreStateful::class,
            VerifyCsrfToken::class,
            VerifyApiAccessMiddleware::class,
        ]);
    Route::get('public/biolinks/{biolink}/digital-products/{digitalProduct}/orders/{order}', [PublicDigitalProductsController::class, 'order'])->middleware('throttle:60,1');
    Route::get('public/biolinks/{biolink}/digital-products/{digitalProduct}/reviews', [ProductReviewsController::class, 'index']);
    Route::get('public/biolinks/{biolink}/digital-products/{digitalProduct}/reviews/{order}', [ProductReviewsController::class, 'show']);
    Route::get('public/stores/{biolink}/digital-products', [PublicDigitalProductsController::class, 'index']);
    Route::get('public/stores/{biolink}/digital-products/{digitalProduct}', [PublicDigitalProductsController::class, 'show']);
    Route::get('public/stores/{biolink}/digital-products/{digitalProduct}/samples/{sample}', [PublicDigitalProductSampleController::class, 'stream'])
        ->name('digital-products.samples.stream');
    Route::post('public/stores/{biolink}/digital-products/{digitalProduct}/checkout', [PublicDigitalProductsController::class, 'checkout'])
        ->middleware('throttle:20,1')
        ->withoutMiddleware([
            EnsureFrontendRequestsAreStateful::class,
            VerifyCsrfToken::class,
            VerifyApiAccessMiddleware::class,
        ]);
    Route::get('public/direct-orders/{order}', [OrderPaymentController::class, 'show'])
        ->middleware('throttle:60,1')
        ->withoutMiddleware([EnsureFrontendRequestsAreStateful::class, VerifyApiAccessMiddleware::class]);
    Route::post('public/direct-orders/{order}/recheck', [OrderPaymentController::class, 'recheck'])
        ->middleware('throttle:6,1')
        ->withoutMiddleware([EnsureFrontendRequestsAreStateful::class, VerifyCsrfToken::class, VerifyApiAccessMiddleware::class]);
    Route::get('public/direct-orders/{order}/payment-instructions', [OrderPaymentController::class, 'instructions'])
        ->middleware('throttle:10,1')
        ->withoutMiddleware([EnsureFrontendRequestsAreStateful::class, VerifyApiAccessMiddleware::class]);
    Route::post('public/direct-orders/{order}/cancel', [OrderPaymentController::class, 'cancel'])
        ->middleware('throttle:10,1')
        ->withoutMiddleware([EnsureFrontendRequestsAreStateful::class, VerifyCsrfToken::class, VerifyApiAccessMiddleware::class]);
    Route::post('public/direct-orders/{order}/reference', [OrderPaymentController::class, 'submit'])
        ->middleware('throttle:10,1')
        ->withoutMiddleware([
            EnsureFrontendRequestsAreStateful::class,
            VerifyCsrfToken::class,
            VerifyApiAccessMiddleware::class,
        ]);
    Route::get('public/stores/{biolink}/digital-products/{digitalProduct}/orders/{order}', [PublicDigitalProductsController::class, 'order'])->middleware('throttle:60,1');
    Route::get('public/stores/{biolink}/digital-products/{digitalProduct}/reviews', [ProductReviewsController::class, 'index']);
    Route::get('public/stores/{biolink}/digital-products/{digitalProduct}/reviews/{order}', [ProductReviewsController::class, 'show']);
    $registerCustomerPortal = function (string $prefix): void {
        Route::post("public/{$prefix}/request-code", [CustomerOrderPortalController::class, 'requestCode'])->middleware('throttle:20,1')->withoutMiddleware([
            VerifyCsrfToken::class,
            VerifyApiAccessMiddleware::class,
        ]);
        Route::post("public/{$prefix}/verify-code", [CustomerOrderPortalController::class, 'verifyCode'])->middleware('throttle:20,1')->withoutMiddleware([
            EnsureFrontendRequestsAreStateful::class,
            VerifyCsrfToken::class,
            VerifyApiAccessMiddleware::class,
        ]);
        Route::get("public/{$prefix}/library", [CustomerOrderPortalController::class, 'library'])->middleware('throttle:60,1')->withoutMiddleware(VerifyApiAccessMiddleware::class);
        Route::get("public/{$prefix}/purchases", [CustomerOrderPortalController::class, 'purchases'])->middleware('throttle:60,1')->withoutMiddleware(VerifyApiAccessMiddleware::class);
        Route::get("public/{$prefix}/courses/{course}", [CustomerOrderPortalController::class, 'course'])->middleware('throttle:60,1')->withoutMiddleware(VerifyApiAccessMiddleware::class);
        Route::get("public/{$prefix}/courses/{course}/lessons/{lesson}", [CustomerOrderPortalController::class, 'lesson'])->middleware('throttle:60,1')->withoutMiddleware(VerifyApiAccessMiddleware::class);
        Route::post("public/{$prefix}/courses/{course}/lessons/{lesson}/complete", [CustomerOrderPortalController::class, 'completeLesson'])->middleware('throttle:60,1')->withoutMiddleware(VerifyApiAccessMiddleware::class);
        Route::post("public/{$prefix}/purchases/{order}/downloads/{entitlement}", [CustomerOrderPortalController::class, 'download'])->middleware('throttle:30,1')->withoutMiddleware(VerifyApiAccessMiddleware::class);
        Route::post("public/{$prefix}/purchases/{order}/resend-receipt", [CustomerOrderPortalController::class, 'resendReceipt'])->middleware('throttle:10,1')->withoutMiddleware(VerifyApiAccessMiddleware::class);
        Route::post("public/{$prefix}/purchases/{order}/review", [CustomerOrderPortalController::class, 'review'])->middleware('throttle:10,1')->withoutMiddleware(VerifyApiAccessMiddleware::class);
        Route::post("public/{$prefix}/purchases/{order}/disputes", [PaymentDisputeController::class, 'store'])
            ->middleware(app()->environment('testing') ? [] : ['throttle:30,1'])
            ->withoutMiddleware(VerifyApiAccessMiddleware::class);
        Route::get("public/{$prefix}/disputes", [PaymentDisputeController::class, 'index'])->middleware('throttle:60,1')->withoutMiddleware(VerifyApiAccessMiddleware::class);
        Route::get("public/{$prefix}/disputes/{dispute}", [PaymentDisputeController::class, 'show'])->middleware('throttle:60,1')->withoutMiddleware(VerifyApiAccessMiddleware::class);
    };
    $registerCustomerPortal('my-portal');
    $registerCustomerPortal('my-order');
    Route::get('storefront/products/{digitalProduct}/public', [StorefrontCheckoutController::class, 'show']);
    Route::post('storefront/products/{digitalProduct}/checkout', [StorefrontCheckoutController::class, 'store'])->middleware('throttle:20,1');
    Route::get('digital-products/{digitalProduct}/public', [StorefrontCheckoutController::class, 'show']);
    Route::post('digital-products/{digitalProduct}/checkout', [StorefrontCheckoutController::class, 'store'])->middleware('throttle:20,1');
});
