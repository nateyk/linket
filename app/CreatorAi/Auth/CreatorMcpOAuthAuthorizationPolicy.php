<?php

namespace App\CreatorAi\Auth;

use Illuminate\Support\Str;
use Laravel\Passport\Passport;

/**
 * Strict, internal preflight for a FUTURE creator MCP OAuth authorization route.
 *
 * This does NOT authenticate a creator, approve workspace consent, issue an
 * OAuth authorization code, exchange a PKCE verifier or grant MCP access.
 * The eventual HTTP controller must invoke this BEFORE delegating to Passport,
 * then enforce CSRF-protected explicit workspace consent. Token issuance must
 * separately validate resource/audience and bind each token to the grant.
 *
 * Passport::ignoreRoutes() must remain in place until that full protocol is
 * implemented, independently reviewed and approved for deployment.
 */
final class CreatorMcpOAuthAuthorizationPolicy
{
    /**
     * @param array<string, mixed> $parameters
     * @return array{client_id:string,redirect_uri:string,response_type:string,scope:string,state:string,code_challenge:string,code_challenge_method:string,resource:string}
     */
    public function validate(array $parameters): array
    {
        if (
            config('creator_ai.enabled') !== true
            || config('creator_ai.features.mcp') !== true
            || config('creator_ai.features.mcp_oauth') !== true
        ) {
            abort(404);
        }

        $resourceUri = config('creator_ai.mcp_resource_url');
        $applicationUrl = config('app.url');

        // No default resource or HTTP/foreign-origin fallback. A misconfigured
        // deployment cannot mint resource-agnostic authorization requests.
        if (
            ! is_string($resourceUri)
            || ! is_string($applicationUrl)
            || ! $this->isHttpsUri($resourceUri, false)
            || ! $this->isHttpsUri($applicationUrl, false)
            || ! $this->sameOrigin($resourceUri, $applicationUrl)
            || ! is_string(parse_url($resourceUri, PHP_URL_PATH))
            || parse_url($resourceUri, PHP_URL_PATH) === ''
        ) {
            abort(503, 'MCP OAuth resource is not configured.');
        }

        $clientId = $this->requiredString($parameters, 'client_id');
        $redirectUri = $this->requiredString($parameters, 'redirect_uri');
        $resource = $this->requiredString($parameters, 'resource');
        $responseType = $this->requiredString($parameters, 'response_type');
        $scope = $this->requiredString($parameters, 'scope');
        $state = $this->requiredString($parameters, 'state');
        $challenge = $this->requiredString($parameters, 'code_challenge');
        $challengeMethod = $this->requiredString($parameters, 'code_challenge_method');

        if (
            ! Str::isUuid($clientId)
            || $responseType !== 'code'
            || $scope !== 'mcp:use'
            || ! preg_match('/\A[A-Za-z0-9._~-]{32,128}\z/', $state)
            || $challengeMethod !== 'S256'
            || ! preg_match('/\A[A-Za-z0-9_-]{43}\z/', $challenge)
            || $resource !== $resourceUri
            || ! $this->isHttpsUri($redirectUri, true)
            || (array_key_exists('prompt', $parameters) && $parameters['prompt'] !== 'consent')
        ) {
            abort(400, 'Invalid MCP OAuth authorization request.');
        }

        // Resolve the registered client from trusted OAuth storage, never from
        // a supplied redirect list or client metadata. Passport enforces its
        // own protocol validation later; this narrows Linket's allowed clients.
        $client = Passport::client()->newQuery()->find($clientId);
        if (
            $client === null
            || $client->revoked
            || $client->confidential()
            || $client->provider !== 'creator_mcp_users'
        ) {
            abort(400, 'Invalid MCP OAuth client.');
        }

        // Do not accept inferred legacy client grant types: they can contain
        // implicit/password/device/client-credentials grants.
        $rawGrantTypes = $client->getRawOriginal('grant_types');
        $grantTypes = is_string($rawGrantTypes)
            ? json_decode($rawGrantTypes, true)
            : null;

        if (
            ! is_array($grantTypes)
            || ! in_array('authorization_code', $grantTypes, true)
            || array_diff($grantTypes, ['authorization_code', 'refresh_token']) !== []
            || ! is_array($client->redirect_uris)
            || ! in_array($redirectUri, $client->redirect_uris, true)
        ) {
            abort(400, 'Invalid MCP OAuth client.');
        }

        // Return only bounded, validated fields. Do not store or log the
        // caller-supplied state or challenge; client CSRF state comparison
        // remains the client's responsibility after the redirect.
        return [
            'client_id' => $clientId,
            'redirect_uri' => $redirectUri,
            'response_type' => 'code',
            'scope' => 'mcp:use',
            'state' => $state,
            'code_challenge' => $challenge,
            'code_challenge_method' => 'S256',
            'resource' => $resource,
        ];
    }

    /** @param array<string, mixed> $parameters */
    private function requiredString(array $parameters, string $name): string
    {
        $value = $parameters[$name] ?? null;

        if (! is_string($value) || $value === '' || strlen($value) > 2048) {
            abort(400, 'Invalid MCP OAuth authorization request.');
        }

        return $value;
    }

    private function isHttpsUri(string $uri, bool $allowQuery): bool
    {
        if (strlen($uri) > 2048 || filter_var($uri, FILTER_VALIDATE_URL) === false) {
            return false;
        }

        $parts = parse_url($uri);

        return is_array($parts)
            && ($parts['scheme'] ?? null) === 'https'
            && isset($parts['host'])
            && ! isset($parts['user'], $parts['pass'])
            && ! isset($parts['user'])
            && ! isset($parts['pass'])
            && ! isset($parts['fragment'])
            && ($allowQuery || ! isset($parts['query']));
    }

    private function sameOrigin(string $resource, string $application): bool
    {
        $resourceParts = parse_url($resource);
        $applicationParts = parse_url($application);

        if (! is_array($resourceParts) || ! is_array($applicationParts)) {
            return false;
        }

        return strcasecmp($resourceParts['host'] ?? '', $applicationParts['host'] ?? '') === 0
            && ($resourceParts['port'] ?? 443) === ($applicationParts['port'] ?? 443);
    }
}
