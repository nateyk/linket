<?php

namespace App\CreatorAi\Auth;

use Closure;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Fail closed for browser consent on HTTP, insecure session persistence,
 * missing atomic-lock cache support or disabled feature gates.
 *
 * The 'web' group also supplies Laravel's CSRF middleware and session.
 * This middleware must execute before the auth redirect so insecure HTTP
 * cannot even begin a login/consent navigation.
 */
final class CreatorMcpOAuthHttpSecurity
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless(
            config('creator_ai.enabled') === true
            && config('creator_ai.features.mcp') === true
            && config('creator_ai.features.mcp_oauth') === true
            && config('creator_ai.features.mcp_http_oauth') === true,
            404,
        );

        abort_unless($request->isSecure(), 403, 'HTTPS is required for OAuth consent.');

        $driver = config('session.driver');
        $cacheDriver = config('cache.default');

        abort_unless(
            is_string($driver) && $driver !== 'cookie'
            && in_array($driver, ['array', 'file', 'database', 'redis', 'memcached', 'dynamodb', 'mongodb'], true)
            && in_array($cacheDriver, ['array', 'file', 'database', 'redis', 'memcached', 'dynamodb', 'mongodb'], true)
            // In-memory sessions/locks are only acceptable for isolated tests,
            // never production where concurrent requests run in workers.
            && (! app()->environment('production') || ($driver !== 'array' && $cacheDriver !== 'array')),
            503,
            'MCP OAuth requires a shared lock-capable session and cache configuration.',
        );

        // Enforce browser authentication AFTER HTTPS is checked; otherwise
        // Laravel may redirect an insecure guest to the login route first.
        $creator = Auth::guard('web')->user();
        if (! $creator instanceof User) {
            // Never generate a login target from request Host/forwarded scheme
            // or Laravel's cached URL generator (which may be http://localhost
            // under tests, proxies or custom-domain deployments).
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
                'MCP OAuth issuer must be a canonical HTTPS origin.',
            );

            $origin = 'https://'.strtolower($parts['host'])
                .(isset($parts['port']) ? ':'.$parts['port'] : '');

            return redirect()->guest($origin.'/login')->withHeaders([
                'Cache-Control' => 'no-store',
                'Referrer-Policy' => 'no-referrer',
            ]);
        }
        abort_unless($creator->hasVerifiedEmail(), 403);

        return $next($request);
    }
}
