<?php

namespace App\CreatorAi\Auth;

use App\CreatorAi\Services\CreatorMcpConnectionRegistry;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * INTERNAL metadata-only mapping of a Passport access-token database ID to
 * one explicitly approved creator/workspace/client/resource connection.
 *
 * bindIssuedAccessToken() is ONLY for a future TRUSTED Passport issuance
 * callback after OAuth code+PKCE validation and browser workspace consent.
 * NEVER call it from user/model-supplied token IDs or expose it as an API.
 * It does not mint or validate a JWT bearer, issue refresh credentials,
 * perform an OAuth exchange, or authorize a public MCP request by itself.
 *
 * A refreshed access token without an explicit, verified rebinding is DENIED.
 * Real token audience/issuer/signature and rotation hooks still require a
 * separate security review and implementation before any public transport.
 */
final class CreatorMcpPassportTokenBindings
{
    public function __construct(
        private readonly CreatorMcpConnectionRegistry $connections,
    ) {}

    /**
     * Link an already-issued, current Passport token record to this creator's
     * explicit connection grant. Do not allow reassignment to another grant.
     */
    public function bindIssuedAccessToken(
        User $creator,
        string $connectionId,
        string $clientId,
        string $accessTokenId,
        string $resource,
    ): void {
        $this->enabled();
        $this->validInputs($creator, $connectionId, $clientId, $accessTokenId, $resource);

        DB::transaction(function () use ($creator, $connectionId, $clientId, $accessTokenId, $resource): void {
            // Serialize with the creator's disconnect operation. Recheck
            // consent/entitlement under locks, not just before transaction.
            $owner = DB::table('users')
                ->where('id', $creator->getKey())->lockForUpdate()->first(['id']);
            abort_unless($owner, 403);

            $grant = DB::table('creator_ai_mcp_connections')
                ->where('id', $connectionId)
                ->where('creator_id', $creator->getKey())
                ->where('oauth_client_id', $clientId)
                ->where('status', 'active')
                ->whereNull('revoked_at')
                ->where('expires_at', '>', now())
                ->lockForUpdate()
                ->first(['consented_at']);
            abort_unless($grant, 403);

            $this->connections->authorize($creator, $connectionId, $clientId);
            $this->clientIsAllowed($clientId);

            $token = DB::table('oauth_access_tokens')
                ->where('id', $accessTokenId)
                ->where('user_id', $creator->getKey())
                ->where('client_id', $clientId)
                ->where('revoked', false)
                ->where('expires_at', '>', now())
                ->lockForUpdate()
                ->first(['scopes', 'created_at']);
            abort_unless($token, 403);

            // Previous tokens must never retroactively inherit new workspace
            // consent. Timestamp is a defense in depth, NOT a substitute for
            // verified authorization-code-to-consent correlation.
            abort_unless(
                $this->hasExactMcpScope($token->scopes)
                && $token->created_at >= $grant->consented_at,
                403,
            );

            // Unique access_token_id prevents a token from ever switching
            // workspaces/clients. insertOrIgnore followed by exact compare
            // gives idempotency even if concurrent callbacks race.
            DB::table('creator_ai_mcp_oauth_token_bindings')->insertOrIgnore([
                'access_token_id' => $accessTokenId,
                'connection_id' => $connectionId,
                'creator_id' => $creator->getKey(),
                'oauth_client_id' => $clientId,
                'resource' => $resource,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $binding = DB::table('creator_ai_mcp_oauth_token_bindings')
                ->where('access_token_id', $accessTokenId)
                ->first(['connection_id', 'creator_id', 'oauth_client_id', 'resource']);
            abort_unless(
                $binding
                && $binding->connection_id === $connectionId
                && (int) $binding->creator_id === (int) $creator->getKey()
                && $binding->oauth_client_id === $clientId
                && $binding->resource === $resource,
                403,
            );
        }, 3);
    }

    /**
     * ONLY after a separate Passport guard verifies the bearer signature,
     * issuer and request token ID. Return the stored, reauthorized workspace;
     * never take workspace ID from an MCP tool parameter.
     */
    public function authorizeBoundAccessToken(
        User $creator,
        string $accessTokenId,
        string $clientId,
        string $resource,
    ): int {
        $this->enabled();

        abort_unless(
            $creator->exists
            && strlen($accessTokenId) === 80
            && Str::isUuid($clientId)
            && $this->matchesCanonicalResource($resource),
            403,
        );

        $binding = DB::table('creator_ai_mcp_oauth_token_bindings')
            ->where('access_token_id', $accessTokenId)
            ->where('creator_id', $creator->getKey())
            ->where('oauth_client_id', $clientId)
            ->where('resource', $resource)
            ->first(['connection_id']);

        abort_unless($binding, 403);

        $token = DB::table('oauth_access_tokens')
            ->where('id', $accessTokenId)
            ->where('user_id', $creator->getKey())
            ->where('client_id', $clientId)
            ->where('revoked', false)
            ->where('expires_at', '>', now())
            ->first(['scopes']);
        abort_unless($token && $this->hasExactMcpScope($token->scopes), 403);

        $this->clientIsAllowed($clientId);

        // Live Pro, membership and grant expiry/revocation checks on EACH read.
        return $this->connections->authorize($creator, $binding->connection_id, $clientId);
    }

    private function enabled(): void
    {
        abort_unless(
            config('creator_ai.enabled') === true
            && config('creator_ai.features.mcp') === true
            && config('creator_ai.features.mcp_oauth') === true,
            403,
        );
    }

    private function validInputs(
        User $creator,
        string $connectionId,
        string $clientId,
        string $accessTokenId,
        string $resource
    ): void {
        abort_unless(
            $creator->exists
            && Str::isUuid($connectionId)
            && Str::isUuid($clientId)
            && strlen($accessTokenId) === 80
            && $this->matchesCanonicalResource($resource),
            403,
        );
    }

    private function matchesCanonicalResource(string $resource): bool
    {
        $configured = config('creator_ai.mcp_resource_url');

        return is_string($configured)
            && strlen($configured) > 0
            && strlen($configured) <= 2048
            && str_starts_with($configured, 'https://')
            && $resource === $configured;
    }

    private function hasExactMcpScope(mixed $scopes): bool
    {
        return is_string($scopes) && json_decode($scopes, true) === ['mcp:use'];
    }

    private function clientIsAllowed(string $clientId): void
    {
        $client = DB::table('oauth_clients')
            ->where('id', $clientId)
            ->where('provider', 'creator_mcp_users')
            ->whereNull('secret')
            ->where('revoked', false)
            ->first(['grant_types']);
        abort_unless($client && is_string($client->grant_types), 403);

        $grants = json_decode($client->grant_types, true);
        abort_unless(
            is_array($grants)
            && in_array('authorization_code', $grants, true)
            && array_diff($grants, ['authorization_code', 'refresh_token']) === [],
            403,
        );
    }
}
