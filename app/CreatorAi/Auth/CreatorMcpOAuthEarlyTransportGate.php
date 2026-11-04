<?php

namespace App\CreatorAi\Auth;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Early HTTP boundary for the default-OFF creator consent endpoints.
 *
 * Runs after Linket's TrustHosts/TrustProxies but BEFORE web/auth routes.
 * Route middleware cannot prevent earlier auth redirects using an insecure
 * request scheme or foreign Host.
 */
final class CreatorMcpOAuthEarlyTransportGate
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->is('oauth/linket/authorize', 'oauth/linket/authorize/*')) {
            return $next($request);
        }

        // Runtime disabling also covers processes using a previously cached
        // route table with these sensitive endpoints registered.
        abort_unless(
            config('creator_ai.features.mcp_http_oauth') === true
            && config('creator_ai.features.mcp_oauth') === true
            && config('creator_ai.features.mcp') === true
            && config('creator_ai.enabled') === true,
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

        return $next($request);
    }
}
