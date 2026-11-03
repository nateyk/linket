<?php

namespace App\CreatorAi\Auth;

use App\Models\User;
use League\OAuth2\Server\Exception\OAuthServerException;
use League\OAuth2\Server\ResourceServer;
use Nyholm\Psr7\ServerRequest;
use Throwable;

/**
 * INTERNAL only; verify actual Passport JWS signature/expiry/revocation first,
 * then exact issuer/audience/scopes and Linket creator grant on every use.
 * No public MCP request controller has been registered.
 */
final class CreatorMcpPassportBearerAccess
{
    public function __construct(
        private readonly ResourceServer $server,
        private readonly CreatorMcpPassportTokenBindings $bindings,
    ) {}

    public function workspaceForBearer(string $bearer): int
    {
        abort_unless(
            $bearer !== '' && strlen($bearer) <= 8192
            && config('creator_ai.enabled') === true
            && config('creator_ai.features.mcp') === true
            && config('creator_ai.features.mcp_oauth') === true,
            403,
        );

        $segments = explode('.', $bearer);
        abort_unless(count($segments) === 3, 403);
        $claims = null;

        try {
            foreach ($segments as $segment) {
                $decoded = base64_decode(strtr($segment, '-_', '+/'), true);
                if (! is_string($decoded)
                    || rtrim(strtr(base64_encode($decoded), '+/', '-_'), '=') !== $segment) {
                    abort(403);
                }
            }

            $signed = $this->server->validateAuthenticatedRequest(
                (new ServerRequest('POST', 'https://localhost/mcp'))
                    ->withHeader('Authorization', 'Bearer '.$bearer)
            );
            $decodedClaims = base64_decode(strtr($segments[1], '-_', '+/'), true);
            $claims = json_decode((string) $decodedClaims, true, 512, JSON_THROW_ON_ERROR);
        } catch (OAuthServerException|Throwable) {
            abort(403, 'Invalid MCP bearer credentials.');
        }

        $issuer = config('creator_ai.oauth_issuer');
        $resource = config('creator_ai.mcp_resource_url');
        $clientId = $signed->getAttribute('oauth_client_id');
        $creatorId = $signed->getAttribute('oauth_user_id');
        $accessId = $signed->getAttribute('oauth_access_token_id');

        abort_unless(
            is_array($claims)
            && is_string($issuer) && str_starts_with($issuer, 'https://')
            && is_string($resource) && str_starts_with($resource, 'https://')
            && ($claims['iss'] ?? null) === $issuer
            && ($claims['aud'] ?? null) === [$clientId, $resource]
            && ($claims['scopes'] ?? null) === ['mcp:use']
            && (string) ($claims['sub'] ?? '') === (string) $creatorId
            && ($claims['jti'] ?? null) === $accessId
            && is_string($clientId)
            && is_string($accessId)
            && ctype_digit((string) $creatorId),
            403,
        );

        $creator = User::query()->find((int) $creatorId);
        abort_unless($creator instanceof User, 403);

        return $this->bindings->authorizeBoundAccessToken($creator, $accessId, $clientId, $resource);
    }
}
