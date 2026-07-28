<?php

use Common\API\CanViewPublicApiDocs;
use Common\Auth\Controllers\EmailVerificationController;
use Common\Auth\Controllers\SocialAuthController;
use Common\Auth\Controllers\TwoFactorQrCodeController;
use Common\Billing\Invoices\InvoiceController;
use Common\Core\Controllers\CsrfTokenController;
use Common\Core\Controllers\HomeController;
use Common\Core\Install\InstallController;
use Common\Core\Install\UpdateController;
use Common\Csv\DownloadCsvExportController;
use Common\Domains\CustomDomainsController;
use Common\Files\Controllers\DownloadFileController;
use Common\Settings\Mail\ConnectGmailAccountController;
use Common\Workspaces\Controllers\WorkspaceMembersController;
use Dedoc\Scramble\Http\Middleware\RestrictedDocsAccess;
use Dedoc\Scramble\Scramble;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Support\Facades\Route;

Route::group(['middleware' => 'web'], function () {

  Route::get('/api-docs', function () {
      return view('scramble::docs', [
          'spec' => file_get_contents(base_path('resources/client/api-public.json')),
          'config' => Scramble::getGeneratorConfig('public'),
      ]);
  })->middleware(CanViewPublicApiDocs::class);

    // Download
    Route::get('file-entries/download/{hashes}', [
        DownloadFileController::class,
        'download',
    ]);

    // UPDATE
    Route::get('update', [UpdateController::class, 'show']);
    Route::get('update/perform', [UpdateController::class, 'runManualUpdateActions']);

    // make sure workspace version of login and register pages are shown on frontend
    Route::get('workspace/join/login', [HomeController::class, 'render']);
    Route::get('workspace/join/register', [HomeController::class, 'render']);

    // WORKSPACES
    Route::get('workspace/join/{workspaceInvite}', [
        WorkspaceMembersController::class,
        'join',
    ]);

    // CSV
    Route::get('csv/download/{id}', [
        DownloadCsvExportController::class,
        'download',
    ]);

    // INVOICES
    Route::get('billing/invoices/{uuid}', [InvoiceController::class, 'show']);

    // AUTH
    Route::post('auth/resend-email-verification', [EmailVerificationController::class, 'resendVerificationEmail'])->middleware(['throttle:6,1']);
    Route::post('auth/validate-email-verification-otp', [EmailVerificationController::class, 'validateOtp'])->middleware(['throttle:6,1'])->withoutMiddleware('verified');

    // SOCIAL AUTH
    Route::get('auth/social/{provider}/connect', [SocialAuthController::class,'connect',]);
    Route::post('auth/social/{provider}/disconnect', [SocialAuthController::class,'disconnect']);
    Route::get('auth/social/{provider}/login', [SocialAuthController::class,'login']);
    Route::post('auth/social/connect-with-password', [SocialAuthController::class,'connectWithPassword']);
    Route::get('auth/social/{provider}/retrieve-profile', [SocialAuthController::class,'retrieveProfile']);
    Route::get('settings/mail/gmail/connect', [ConnectGmailAccountController::class,'connectGmail']);
    Route::get('secure/auth/social/{provider}/callback', [SocialAuthController::class,'loginCallback']);

    // CUSTOM DOMAINS
    Route::group(
        ['prefix' => 'secure', 'middleware' => 'customDomainsEnabled'],
        function () {
            Route::post('custom-domains/validate-host', [
                CustomDomainsController::class,
                'validateHost',
            ])->where('method', 'store|update')->withoutMiddleware(ValidateCsrfToken::class);
            Route::post('custom-domains/validate-dns/2BrM45vvfS', [
                CustomDomainsController::class,
                'validateDomainDns',
            ])->withoutMiddleware(ValidateCsrfToken::class);
            Route::get('custom-domains/validate-dns/2BrM45vvfS/response', [
                CustomDomainsController::class,
                'validateDomainDnsResponse',
            ])->withoutMiddleware(ValidateCsrfToken::class);
        },
    );

    // TWO FACTOR AUTH
    Route::get('auth/user/two-factor/qr-code', [
        TwoFactorQrCodeController::class,
        'show',
    ])->middleware(['auth']);

    // Laravel Auth routes with names so route('login') and similar calls don't error out
    Route::get('login', [HomeController::class, 'render'])->name('login');
    Route::get('register', [HomeController::class, 'render'])->name('register');
});

if (!config('app.installed')) {
    Route::get('install', [InstallController::class, 'introductionStep'])->name(
        'install',
    );
    Route::get('install/requirements', [
        InstallController::class,
        'requirementsStep',
    ]);
    Route::get('install/database', [InstallController::class, 'databaseStep']);
    Route::post('install/database/validate', [
        InstallController::class,
        'insertAndValidateDatabaseCredentials',
    ])->withoutMiddleware(ValidateCsrfToken::class);
    Route::get('install/admin', [InstallController::class, 'adminStep']);
    Route::post('install/admin/validate', [
        InstallController::class,
        'validateAdminCredentials',
    ])->withoutMiddleware(ValidateCsrfToken::class);
    Route::get('install/finalize', [InstallController::class, 'finalizeStep']);
}

Route::get('csrf-token', CsrfTokenController::class);

if (config('app.service_worker_integrated')) {
    Route::get('sw.js', function () {
        return response()
        ->file(public_path('build/sw.js'), [
            'Content-Type' => 'application/javascript; charset=utf-8',
            'Service-Worker-Allowed' => '/',
        ]);
    })->withoutMiddleware('web');
}
