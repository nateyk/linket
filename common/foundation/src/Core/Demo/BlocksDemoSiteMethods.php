<?php

namespace Common\Core\Demo;

use Closure;
use Common\Core\Demo\BlockedOnDemoSite;
use Illuminate\Http\Request;
use ReflectionMethod;

class BlocksDemoSiteMethods
{
    public function handle(Request $request, Closure $next)
    {
        $route = $request->route();

        if (!$route) {
            return $next($request);
        }

        $controllerClass = $route->getControllerClass();
        $controllerMethod = $route->getActionMethod();

        if (
            !$controllerClass ||
            !$controllerMethod ||
            !method_exists($controllerClass, $controllerMethod)
        ) {
            return $next($request);
        }

        $attributes = (new ReflectionMethod(
            $controllerClass,
            $controllerMethod,
        ))->getAttributes(BlockedOnDemoSite::class);

        if (
            $attributes &&
            config('app.demo') &&
            config('app.demo_email') !== $request->user()?->email
        ) {
            abort(403, 'This action is disabled on demo site.');
        }

        return $next($request);
    }
}
