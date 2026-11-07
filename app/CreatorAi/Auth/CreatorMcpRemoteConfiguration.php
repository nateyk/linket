<?php

namespace App\CreatorAi\Auth;

/**
 * Canonical, operator-configured HTTPS OAuth endpoints. Never construct these
 * addresses from request Host, forwarded headers, query strings or model input.
 */
final class CreatorMcpRemoteConfiguration
{
    /** @return array{issuer:string,resource:string,resource_metadata:string,authorization_endpoint:string,token_endpoint:string} */
    public function endpoints(): array
    {
        $issuer = config('creator_ai.oauth_issuer');
        $appUrl = config('app.url');
        $resource = config('creator_ai.mcp_resource_url');
        abort_unless(
            is_string($issuer) && strlen($issuer) <= 2048
            && is_string($appUrl) && strlen($appUrl) <= 2048
            && is_string($resource) && strlen($resource) <= 2048,
            503,
        );
        $parts = parse_url($issuer);
        abort_unless(
            is_array($parts)
            && ($parts['scheme'] ?? null) === 'https'
            && is_string($parts['host'] ?? null) && $parts['host'] !== ''
            && in_array($parts['path'] ?? '', ['', '/'], true)
            && ! isset($parts['user']) && ! isset($parts['pass'])
            && ! isset($parts['query']) && ! isset($parts['fragment'])
            && filter_var($issuer, FILTER_VALIDATE_URL) !== false,
            503,
        );

        $origin = 'https://'.strtolower($parts['host'])
            .(isset($parts['port']) ? ':'.$parts['port'] : '');
        abort_unless(
            rtrim($issuer, '/') === $origin
            && rtrim($appUrl, '/') === $origin
            && $resource === $origin.'/mcp',
            503,
            'MCP discovery requires an exact canonical HTTPS issuer and resource.',
        );

        return [
            'issuer' => $origin,
            'resource' => $resource,
            'resource_metadata' => $origin.'/.well-known/oauth-protected-resource/mcp',
            'authorization_endpoint' => $origin.'/oauth/linket/authorize',
            'token_endpoint' => $origin.'/oauth/linket/token',
        ];
    }
}
