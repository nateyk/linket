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
            return redirect()->guest(route('login'));
        }
        abort_unless($creator->hasVerifiedEmail(), 403);

        return $next($request);
    }
}
