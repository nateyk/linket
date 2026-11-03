<?php

use App\CreatorAi\Auth\CreatorMcpOAuthHttpConsentController;
use App\CreatorAi\Auth\CreatorMcpOAuthHttpSecurity;
use Illuminate\Support\Facades\Route;

// This file may be included by routes/web.php or loaded by route-focused
// feature tests. It MUST NOT register OAuth endpoints by default.
if (config('creator_ai.features.mcp_http_oauth') !== true) {
    return;
}

// Keep Laravel Passport's default OAuth routes disabled. Only browser consent
// is registered in this slice; /oauth/token, discovery and /mcp stay absent.
Route::prefix('oauth/linket')->name('creator-ai.oauth.')
    ->middleware(['web', CreatorMcpOAuthHttpSecurity::class])
    ->group(function (): void {
        Route::get('authorize', [CreatorMcpOAuthHttpConsentController::class, 'authorize'])
            ->block(30, 10)->name('authorize');

        Route::post('authorize/approve', [CreatorMcpOAuthHttpConsentController::class, 'approve'])
            ->block(30, 10)->name('approve');

        Route::post('authorize/deny', [CreatorMcpOAuthHttpConsentController::class, 'deny'])
            ->block(30, 10)->name('deny');
    });
