<?php

use App\CreatorAi\Auth\CreatorMcpOAuthHttpConsentController;
use App\CreatorAi\Auth\CreatorMcpOAuthHttpSecurity;
use App\CreatorAi\Auth\CreatorMcpOAuthHttpTokenController;
use Illuminate\Support\Facades\Route;

// This file may be included by routes/web.php or loaded by route-focused
// feature tests. It MUST NOT register OAuth endpoints by default.
// The token route is independently disabled, stateless and never accepts
// Passport's generic implicit/password/client-credentials grant types.
if (config('creator_ai.features.mcp_http_token') === true) {
    Route::post('oauth/linket/token', CreatorMcpOAuthHttpTokenController::class)
        ->withoutMiddleware('web')
        ->middleware('throttle:10,1')
        ->name('creator-ai.oauth.token');
}
if (config('creator_ai.features.mcp_http_oauth') !== true) {
    return;
}

// Passport's default OAuth routes stay disabled. Browser consent is
// independent of the Linket-specific token route. Discovery and MCP stay absent.
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
