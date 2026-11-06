<?php

namespace App\CreatorAi\Auth;

use Illuminate\Support\ServiceProvider;
use Laravel\Passport\Bridge\AuthCodeRepository as PassportAuthCodeRepository;
use Laravel\Passport\Bridge\AccessTokenRepository as PassportAccessTokenRepository;
use Laravel\Passport\Passport;

/**
 * Register an isolated Passport guard without changing Linket's existing
 * web/Sanctum user provider, authentication defaults, or token methods.
 *
 * Security gate: Passport automatically exposes /oauth/authorize and
 * /oauth/token. Suppress ALL default Passport routes during this foundation
 * milestone. Later audited OAuth registration must be explicit, scoped to
 * creator_mcp, protected by PKCE/consent, and separately feature gated.
 */
final class CreatorMcpOAuthServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Only trusted, request-scoped Linket consent can persist a Passport
        // authorization code. The public Passport routes remain disabled.
        $this->app->scoped(CreatorMcpPassportCodeIssuanceContext::class);
        $this->app->bind(
            PassportAuthCodeRepository::class,
            CreatorMcpAuthCodeRepository::class,
        );

        $this->app->scoped(CreatorMcpPassportTokenIssuanceContext::class);
        $this->app->bind(
            PassportAccessTokenRepository::class,
            CreatorMcpPassportAccessTokenRepository::class,
        );

        // Preserve any other scopes that were already registered.
        Passport::tokensCan([
            ...Passport::$scopes,
            'mcp:use' => 'Read authorized creator workspace reporting via Linket MCP',
        ]);

        config()->set('auth.providers.creator_mcp_users', [
            'driver' => 'eloquent',
            'model' => PassportCreatorIdentity::class,
        ]);

        config()->set('auth.guards.creator_mcp', [
            'driver' => 'passport',
            'provider' => 'creator_mcp_users',
        ]);

        // The remote MCP server and consent/token routes are not yet
        // audited. A new Composer package must NOT expose an OAuth server.
        Passport::ignoreRoutes();
    }
}
