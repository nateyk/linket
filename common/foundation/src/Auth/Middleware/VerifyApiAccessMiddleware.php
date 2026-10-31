<?php

namespace Common\Auth\Middleware;

use Closure;
use Illuminate\Http\Request;

class VerifyApiAccessMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        // Stateful browser requests use route-level authentication and policy
        // checks. Public browser API routes must remain usable by guests.
        if (requestIsFromFrontend()) {
            return $next($request);
        }

        if (!$user) {
            abort(401);
        }

        if (!$user->hasPermission('api.access')) {
            abort(403);
        }

        return $next($request);
    }
}
