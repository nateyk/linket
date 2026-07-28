<?php

namespace Common\API;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CanViewPublicApiDocs
{
    public function handle(Request $request, Closure $next): Response
    {
        $model = $request->user() ?: app('guestRole');

        if (!$model->hasPermission('api.access')) {
            abort(401);
        }

        return $next($request);
    }
}
