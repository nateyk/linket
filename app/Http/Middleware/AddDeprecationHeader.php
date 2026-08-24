<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class AddDeprecationHeader
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('Deprecation', 'true');
        $response->headers->set('Sunset', now()->addDays(90)->toRfc7231String());

        try {
            $workspaceId = null;
            if (class_exists(\Common\Workspaces\ActiveWorkspace::class)) {
                try {
                    $ws = \Common\Workspaces\ActiveWorkspace::get(createIfNotFound: false);
                    $workspaceId = $ws?->id ?? null;
                } catch (\Throwable $e) {
                    // ignore
                }
            }
            if (!$workspaceId) {
                $workspaceId = $request->input('workspace_id');
            }
            if (!$workspaceId) {
                $routeStore = $request->route('store');
                if ($routeStore) {
                    $workspaceId = $routeStore instanceof \App\Stores\Models\Store ? $routeStore->workspace_id : null;
                }
            }
            if (!$workspaceId) {
                $routeBiolink = $request->route('biolink') ?? $request->route('biolinkId') ?? $request->route('id');
                if ($routeBiolink instanceof \App\Stores\Models\Store) {
                    $workspaceId = $routeBiolink->workspace_id;
                } elseif (is_numeric($routeBiolink)) {
                    // try to fetch store workspace without hitting DB if possible; fallback
                    $workspaceId = null;
                }
            }

            Log::info('store.api.deprecated', [
                'route' => $request->path(),
                'workspace_id' => $workspaceId,
            ]);
        } catch (\Throwable $e) {
            // never break response due to logging
        }

        return $response;
    }
}
