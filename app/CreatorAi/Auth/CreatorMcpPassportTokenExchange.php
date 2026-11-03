<?php

namespace App\CreatorAi\Auth;

use App\CreatorAi\Services\CreatorMcpConnectionRegistry;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Laravel\Passport\Passport;
use League\OAuth2\Server\AuthorizationServer;
use League\OAuth2\Server\Exception\OAuthServerException;
use Nyholm\Psr7\Response;
use Nyholm\Psr7\ServerRequest;
use Psr\Http\Message\ResponseInterface;

/**
 * INTERNAL only. The default Passport /oauth/token route is disabled.
 * Actual League token issuance occurs only after matching the encrypted
 * authorization code / refresh token to the stored Linket workspace consent.
 * This service must not be exposed without audited HTTPS route controls.
 */
final class CreatorMcpPassportTokenExchange
{
    public function __construct(
        private readonly CreatorMcpPassportEncryptedPayload $encrypted,
        private readonly CreatorMcpPassportTokenIssuanceContext $context,
        private readonly CreatorMcpConnectionRegistry $connections,
        private readonly AuthorizationServer $server,
    ) {}

    public function exchangeAuthorizationCode(
        string $code,
        string $clientId,
        string $redirectUri,
        string $verifier,
        string $resource,
    ): ResponseInterface {
        $this->guardConfiguration($resource);
        abort_unless(
            strlen($code) <= 8192
            && preg_match('/\A[A-Za-z0-9._~-]{43,128}\z/', $verifier) === 1,
            403,
        );

        $payload = $this->encrypted->decode($code);
        $codeId = $payload['auth_code_id'] ?? null;
        abort_unless(is_string($codeId) && $codeId !== '' && strlen($codeId) <= 100, 403);

        return DB::transaction(function () use ($payload, $codeId, $code, $clientId, $redirectUri, $verifier, $resource): ResponseInterface {
            $row = DB::table('creator_ai_mcp_oauth_code_bindings')
                ->where('auth_code_id', $codeId)
                ->where('expires_at', '>', now())
                ->lockForUpdate()->first();
            abort_unless(
                $row
                && $row->oauth_client_id === $clientId
                && $row->redirect_uri === $redirectUri
                && $row->resource === $resource
                && $row->code_challenge === rtrim(strtr(base64_encode(hash('sha256', $verifier, true)), '+/', '-_'), '=')
                 && ($payload['client_id'] ?? null) === $clientId
                && ($payload['redirect_uri'] ?? null) === $redirectUri
                && ($payload['user_id'] ?? null) == $row->creator_id
                && ($payload['code_challenge_method'] ?? null) === 'S256'
                && ($payload['scopes'] ?? null) === ['mcp:use']
                && ($payload['code_challenge'] ?? null) === $row->code_challenge,
                403,
            );

            $authCode = DB::table('oauth_auth_codes')
                ->where('id', $codeId)->where('revoked', false)
                ->where('expires_at', '>', now())->lockForUpdate()->first();
            abort_unless(
                $authCode && (int) $authCode->user_id === (int) $row->creator_id
                && $authCode->client_id === $clientId,
                403,
            );

            $creator = User::query()->find($row->creator_id);
            abort_unless($creator instanceof User, 403);
            $this->connections->authorize($creator, $row->connection_id, $clientId);
            $this->validClient($clientId);

            return $this->issue([
                'connection_id' => $row->connection_id,
                'creator_id' => (int) $row->creator_id,
                'oauth_client_id' => $clientId,
                'resource' => $resource,
            ], [
                'grant_type' => 'authorization_code',
                'client_id' => $clientId,
                'code' => $code,
                'redirect_uri' => $redirectUri,
                'code_verifier' => $verifier,
            ]);
        }, 3);
    }

    public function refresh(string $refresh, string $clientId, string $resource): ResponseInterface
    {
        $this->guardConfiguration($resource);
        $payload = $this->encrypted->decode($refresh);

        $refreshId = $payload['refresh_token_id'] ?? null;
        $accessId = $payload['access_token_id'] ?? null;
        abort_unless(
            is_string($refreshId) && strlen($refreshId) === 80
            && is_string($accessId) && strlen($accessId) === 80
            && ($payload['client_id'] ?? null) === $clientId
            && ($payload['scopes'] ?? null) === ['mcp:use'],
            403,
        );

        return DB::transaction(function () use ($refreshId, $accessId, $refresh, $clientId, $resource, $payload): ResponseInterface {
            $refreshRow = DB::table('oauth_refresh_tokens')
                ->where('id', $refreshId)
                ->where('access_token_id', $accessId)
                ->where('revoked', false)
                ->where('expires_at', '>', now())
                ->lockForUpdate()
                ->first();
            abort_unless($refreshRow, 403);

            $binding = DB::table('creator_ai_mcp_oauth_token_bindings')
                ->where('access_token_id', $accessId)
                ->where('oauth_client_id', $clientId)
                ->where('resource', $resource)
                ->first();
            abort_unless($binding, 403);
            abort_unless((string) ($payload['user_id'] ?? '') === (string) $binding->creator_id, 403);

            // Revoking only the old access token must also prevent use of
            // its refresh credential; the refresh row alone is insufficient.
            $oldAccess = DB::table('oauth_access_tokens')
                ->where('id', $accessId)
                ->where('user_id', $binding->creator_id)
                ->where('client_id', $clientId)
                ->where('revoked', false)
                ->where('expires_at', '>', now())
                ->lockForUpdate()
                ->first(['scopes']);
            abort_unless($oldAccess && json_decode((string) $oldAccess->scopes, true) === ['mcp:use'], 403);

            $creator = User::query()->find($binding->creator_id);
            abort_unless($creator instanceof User, 403);

            $this->connections->authorize($creator, $binding->connection_id, $clientId);
            $this->validClient($clientId);

            return $this->issue([
                'connection_id' => $binding->connection_id,
                'creator_id' => (int) $binding->creator_id,
                'oauth_client_id' => $clientId,
                'resource' => $resource,
            ], [
                'grant_type' => 'refresh_token',
                'client_id' => $clientId,
                'refresh_token' => $refresh,
                'scope' => 'mcp:use',
            ]);
        }, 3);
    }

    /**
     * Actual Passport/League PKCE + signature generation. A database rollback
     * covers all code/token/binding/refresh changes on any failure.
     *
     * @param array{connection_id:string,creator_id:int,oauth_client_id:string,resource:string} $grant
     * @param array<string,string> $body
     */
    private function issue(array $grant, array $body): ResponseInterface
    {
        $request = (new ServerRequest('POST', rtrim((string) config('app.url'), '/').'/oauth/token'))
            ->withParsedBody($body)
            ->withHeader('content-type', 'application/x-www-form-urlencoded');

        $this->server->revokeRefreshTokens(true);

        try {
            return $this->context->withGrant(
                $grant,
                fn (): ResponseInterface => $this->server->respondToAccessTokenRequest($request, new Response),
            );
        } catch (OAuthServerException) {
            abort(403, 'OAuth token exchange was rejected.');
        }
    }

    private function guardConfiguration(string $resource): void
    {
        abort_unless(
            config('creator_ai.enabled') === true
            && config('creator_ai.features.mcp') === true
            && config('creator_ai.features.mcp_oauth') === true,
            403,
        );
        $issuer = config('creator_ai.oauth_issuer');
        $configured = config('creator_ai.mcp_resource_url');
        $appUrl = config('app.url');
        abort_unless(
            is_string($issuer) && str_starts_with($issuer, 'https://')
            && is_string($configured) && str_starts_with($configured, 'https://')
            && is_string($appUrl) && str_starts_with($appUrl, 'https://')
            && $resource === $configured
            && $this->origin($issuer) === $this->origin($configured)
            && $this->origin($issuer) === $this->origin($appUrl)
            && (config('passport.connection') === null || config('passport.connection') === config('database.default')),
            403,
        );
    }

    private function origin(string $url): string
    {
        $parts = parse_url($url);
        if (! is_array($parts) || ($parts['scheme'] ?? null) !== 'https' || ! isset($parts['host'])) {
            return '';
        }
        return 'https://'.strtolower($parts['host']).':'.($parts['port'] ?? 443);
    }

    private function validClient(string $clientId): void
    {
        $client = Passport::client()->newQuery()->find($clientId);
        abort_unless(
            $client
            && ! $client->revoked
            && ! $client->confidential()
            && $client->provider === 'creator_mcp_users'
            && $client->hasGrantType('authorization_code')
            && $client->hasGrantType('refresh_token')
            && array_diff($client->grant_types, ['authorization_code', 'refresh_token']) === [],
            403,
        );
    }
}
