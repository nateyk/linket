<?php

namespace Common\Core\Exceptions;

use Illuminate\Auth\Access\Response as LaravelAccessResponse;
use Illuminate\Contracts\Support\Responsable;

class AccessResponseWithAction extends LaravelAccessResponse implements
    Responsable
{
    public string $action;
    public string $resources;

    public static function denyWithReason(
        string $message,
        mixed $code,
        string $action, // create, update, delete
        string $resources,
    ): self {
        $response = new self(allowed: false, message: $message, code: $code);
        $response->action = $action;
        $response->resources = $resources;
        return $response;
    }

    public function toResponse($request)
    {
        if (!$request->expectsJson()) {
            abort(403);
        }

        return response()->json(
            [
                'message' => $this->message,
                'reason' => $this->code,
                'type' => 'policyFail',
                'action' => $this->action,
                'resources' => $this->resources,
            ],
            $this->httpCode ?? 403,
        );
    }
}
