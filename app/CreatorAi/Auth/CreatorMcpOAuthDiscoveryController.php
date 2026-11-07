<?php

namespace App\CreatorAi\Auth;

use Illuminate\Http\JsonResponse;

/**
 * RFC 9728 / RFC 8414 metadata for only the Linket creator MCP resource.
 * Do NOT register Passport's public routes or Laravel MCP oauthRoutes():
 * both can expose unsupported grants or dynamic client registration.
 */
final class CreatorMcpOAuthDiscoveryController
{
    public function __construct(
        private readonly CreatorMcpRemoteConfiguration $remote,
    ) {}

    public function resource(): JsonResponse
    {
        $urls = $this->remote->endpoints();

        return response()->json([
            'resource' => $urls['resource'],
            'authorization_servers' => [$urls['issuer']],
            'scopes_supported' => ['mcp:use'],
            'bearer_methods_supported' => ['header'],
        ], 200, $this->headers());
    }

    public function authorizationServer(): JsonResponse
    {
        $urls = $this->remote->endpoints();

        return response()->json([
            'issuer' => $urls['issuer'],
            'authorization_endpoint' => $urls['authorization_endpoint'],
            'token_endpoint' => $urls['token_endpoint'],
            'response_types_supported' => ['code'],
            'response_modes_supported' => ['query'],
            'grant_types_supported' => ['authorization_code', 'refresh_token'],
            'token_endpoint_auth_methods_supported' => ['none'],
            'code_challenge_methods_supported' => ['S256'],
            'scopes_supported' => ['mcp:use'],
        ], 200, $this->headers());
    }

    /** @return array<string,string> */
    private function headers(): array
    {
        return [
            'Cache-Control' => 'no-store',
            'Pragma' => 'no-cache',
            'X-Content-Type-Options' => 'nosniff',
        ];
    }
}
