<?php

namespace App\CreatorAi\Auth;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

/**
 * HTTP boundary for every MCP request, including discovery/initialize and
 * tools/list. No session, Sanctum token, query credential or model-provided
 * creator/workspace identifier may substitute for a signed Passport bearer.
 */
final class CreatorMcpOAuthRemoteSecurity
{
    public const GRANT_ATTRIBUTE = 'creator_ai.mcp.verified_grant';

    public function __construct(
        private readonly CreatorMcpRemoteConfiguration $remote,
        private readonly CreatorMcpPassportBearerAccess $bearer,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $urls = $this->remote->endpoints();

        if ($request->query->count() !== 0) {
            return response()->json(['error' => 'invalid_request'], 400, $this->headers());
        }
        if (
            $request->headers->has('Cookie')
            || ($request->headers->has('Origin')
                && $request->header('Origin') !== $urls['issuer'])
        ) {
            return $this->unauthorized($urls['resource_metadata']);
        }

        // Reject oversized messages before the MCP JSON-RPC decoder runs.
        if (strlen($request->getContent()) > 32768) {
            return response()->json(['error' => 'request_too_large'], 413, $this->headers());
        }

        $authorization = $request->header('Authorization');
        if (
            ! is_string($authorization) || strlen($authorization) > 8200
            || preg_match('/\ABearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\z/D', $authorization, $match) !== 1
        ) {
            return $this->unauthorized($urls['resource_metadata']);
        }

        try {
            // Performs Passport/League signature, expiry, issuer, audience,
            // scope and token-record verification, then current consent,
            // creator, workspace membership and Verify.et Pro checks.
            $grant = $this->bearer->grantForBearer($match[1]);
        } catch (HttpExceptionInterface $error) {
            if ($error->getStatusCode() === 503) {
                return response()->json(['error' => 'temporarily_unavailable'], 503, $this->headers());
            }

            return $this->unauthorized($urls['resource_metadata']);
        }

        $request->attributes->set(self::GRANT_ATTRIBUTE, $grant);
        $response = $next($request);
        foreach ($this->headers() as $key => $value) {
            $response->headers->set($key, $value);
        }

        return $response;
    }

    private function unauthorized(string $metadata): Response
    {
        return response()->json(['error' => 'invalid_token'], 401, [
            ...$this->headers(),
            'WWW-Authenticate' => 'Bearer realm="linket-mcp", resource_metadata="'.$metadata.'", scope="mcp:use", error="invalid_token", error_description="Linket OAuth authorization is required"',
        ]);
    }

    /** @return array<string,string> */
    private function headers(): array
    {
        return [
            'Cache-Control' => 'no-store',
            'Pragma' => 'no-cache',
            'X-Content-Type-Options' => 'nosniff',
            'Referrer-Policy' => 'no-referrer',
        ];
    }
}
