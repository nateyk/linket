<?php

namespace Common\Workspaces\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class EnsureWorkspacesIntegrated
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless(config('app.workspaces_integrated'), 404);

        return $next($request);
    }
}
