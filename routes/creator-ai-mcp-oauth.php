<?php

use App\CreatorAi\Auth\CreatorMcpOAuthDiscoveryController;
use App\CreatorAi\Auth\CreatorMcpOAuthHttpConsentController;
use App\CreatorAi\Auth\CreatorMcpOAuthHttpSecurity;
use App\CreatorAi\Auth\CreatorMcpOAuthHttpTokenController;
use App\CreatorAi\Auth\CreatorMcpOAuthRemoteSecurity;
use App\CreatorAi\Mcp\CreatorMcpReadOnlyServer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Laravel\Mcp\Server\Middleware\ReorderJsonAccept;
use Laravel\Mcp\Server\Middleware\ValidateMcpHeaders;
use Laravel\Mcp\Server\Transport\HttpTransport;

// An independently gated, stateless form-only PKCE/refresh token endpoint.
// Never enable Passport's generic public OAuth routes.
if (config('creator_ai.features.mcp_http_token') === true) {
    Route::post('oauth/linket/token', CreatorMcpOAuthHttpTokenController::class)
        ->withoutMiddleware('web')
        ->middleware('throttle:10,1,creator-mcp-token:')
        ->name('creator-ai.oauth.token');
}

// Do not use Mcp::oauthRoutes() here: it publishes generic Passport and
// dynamic client registration endpoints. Only these exact metadata routes
// are supported; both require working consent and token endpoints.
if (config('creator_ai.features.mcp_http_discovery') === true) {
    Route::get('.well-known/oauth-protected-resource/mcp', [CreatorMcpOAuthDiscoveryController::class, 'resource'])
        ->name('creator-ai.oauth.resource-metadata');
    Route::get('.well-known/oauth-authorization-server', [CreatorMcpOAuthDiscoveryController::class, 'authorizationServer'])
        ->name('creator-ai.oauth.server-metadata');
}

// Laravel MCP's real HTTP transport/protocol implementation, but with the
// Linket-specific signed Passport + live workspace authorization BEFORE
// MCP method parsing; Laravel's generic Sanctum MCP auth is not reused.
if (config('creator_ai.features.mcp_http_server') === true) {
    Route::post('mcp', static function (Request $request) {
        $transport = new HttpTransport($request);
        $server = app(CreatorMcpReadOnlyServer::class, ['transport' => $transport]);
        $server->start();

        return $transport->run();
    })
        ->withoutMiddleware('web')
        ->middleware([
            'throttle:30,1,creator-mcp-read:',
            CreatorMcpOAuthRemoteSecurity::class,
            ReorderJsonAccept::class,
            ValidateMcpHeaders::class,
        ])
        ->name('creator-ai.mcp.http');

    Route::get('mcp', static fn () => response('', 405, ['Allow' => 'POST']));
    Route::delete('mcp', static fn () => response('', 405, ['Allow' => 'POST']));
}

if (config('creator_ai.features.mcp_http_oauth') !== true) {
    return;
}

// Explicit browser consent is guarded by HTTPS, session/CSRF and nonce locks;
// Passport's built-in reuse-prior-consent shortcut remains disabled.
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
