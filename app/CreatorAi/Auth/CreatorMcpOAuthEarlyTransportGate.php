<?php

namespace App\CreatorAi\Auth;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Global, pre-routing transport boundary; never allow Host/HTTP-based guest
 * redirects to consume OAuth requests, including cached routes after shutdown.
 */
final class CreatorMcpOAuthEarlyTransportGate
{
    public function handle(Request $request, Closure $next): Response
    {
        $isConsent = $request->is('oauth/linket/authorize', 'oauth/linket/authorize/*');
        $isToken = $request->is('oauth/linket/token');
        $isDiscovery = $request->is(
            '.well-known/oauth-protected-resource/mcp',
            '.well-known/oauth-authorization-server',
        );
        $isMcp = $request->is('mcp');

        if (! $isConsent && ! $isToken && ! $isDiscovery && ! $isMcp) {
            return $next($request);
        }

        $feature = match (true) {
            $isConsent => 'mcp_http_oauth',
            $isToken => 'mcp_http_token',
            $isDiscovery => 'mcp_http_discovery',
            default => 'mcp_http_server',
        };

        // Both route-registration and runtime gates are required. A cached
        // route cannot continue serving requests after a feature is disabled.
        abort_unless(
            config('creator_ai.features.'.$feature) === true
            && config('creator_ai.features.mcp_oauth') === true
            && config('creator_ai.features.mcp') === true
            && config('creator_ai.enabled') === true
            && ((! $isDiscovery && ! $isMcp)
                || (config('creator_ai.features.mcp_http_oauth') === true
                    && config('creator_ai.features.mcp_http_token') === true)),
            404,
        );

        $issuer = config('creator_ai.oauth_issuer');
        $parts = is_string($issuer) ? parse_url($issuer) : false;
        abort_unless(
            is_array($parts)
            && ($parts['scheme'] ?? null) === 'https'
            && is_string($parts['host'] ?? null)
            && $parts['host'] !== ''
            && ! isset($parts['user'])
            && ! isset($parts['pass'])
            && ! isset($parts['query'])
            && ! isset($parts['fragment']),
            503,
        );

        abort_unless(
            $request->isSecure()
            && strcasecmp($request->getHost(), $parts['host']) === 0
            && $request->getPort() === (int) ($parts['port'] ?? 443),
            403,
            'HTTPS and the canonical Linket OAuth issuer host are required.',
        );

        if ($isDiscovery || $isMcp) {
            app(CreatorMcpRemoteConfiguration::class)->endpoints();
        }

        if ($isConsent) {
            app(CreatorMcpOAuthHttpSecurity::class)->ensureSessionConfiguration();
        }

        if ($isToken || $isMcp) {
            // An OAuth/MCP rate limiter must be shared across production
            // workers, not scoped to an isolated application instance.
            abort_unless(
                ! app()->environment('production')
                || in_array(config('cache.default'), ['file', 'database', 'redis', 'memcached', 'dynamodb'], true),
                503,
            );
        }

        return $next($request);
    }
}
