<?php

namespace Common\Core\Exceptions;

use Illuminate\Session\TokenMismatchException;
use Illuminate\Contracts\Container\Container;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Contracts\Support\Responsable;
use Illuminate\Foundation\Exceptions\Handler;
use Illuminate\Support\Facades\Auth;
use Sentry\Laravel\Integration;
use Sentry\State\Scope;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Throwable;
use function Sentry\configureScope;

class BaseExceptionHandler extends Handler
{
    public function __construct(Container $container)
    {
        $this->internalDontReport = array_filter(
            $this->internalDontReport,
            fn($class) => $class !== TokenMismatchException::class,
        );

        parent::__construct($container);
    }

    public function render($request, Throwable $e)
    {
        $accessResponse = method_exists($e, 'response') ? $e->response() : null;

        if ($accessResponse instanceof Responsable) {
            return $accessResponse->toResponse($request);
        }

        $isAuthException =
            $e instanceof AuthorizationException ||
            ($e instanceof HttpException && $e->getStatusCode() === 403);

        if (
            $isAuthException &&
            (requestIsFromFrontend() &&
                !$request->expectsJson() &&
                !Auth::check())
        ) {
            return redirect('/login');
        }

        return parent::render($request, $e);
    }

    public function register()
    {
        if (config('app.env') !== 'production') {
            return;
        }

        configureScope(function (Scope $scope): void {
            $scope->setContext('app_name', ['value' => config('app.name')]);
        });

        $this->reportable(function (Throwable $e) {
            Integration::captureUnhandledException($e);
        });
    }

    protected function convertExceptionToArray(Throwable $e): array
    {
        $array = parent::convertExceptionToArray($e);

        if ($array['message'] === 'Server Error') {
            $array['message'] = __(
                'There was an issue. Please try again later.',
            );
        }

        if ($array['message'] === 'This action is unauthorized.') {
            $array['message'] = __(
                "You don't have required permissions for this action.",
            );
        }

        return $array;
    }

    protected function shouldReturnJson($request, Throwable $e)
    {
        if (str_starts_with($request->path(), 'api/')) {
            return true;
        }

        return parent::shouldReturnJson($request, $e);
    }
}
