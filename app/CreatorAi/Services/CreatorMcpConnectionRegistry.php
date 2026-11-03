<?php

namespace App\CreatorAi\Services;

use App\Models\User;
use Carbon\CarbonImmutable;
use DateTimeInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Local consent-grant registry for a future separately authenticated OAuth
 * remote MCP server. NO bearer tokens, authorization codes, refresh tokens,
 * API keys or OAuth client secrets are created or stored by this service.
 *
 * recordConsent() is ONLY for a trusted server-side OAuth consent callback.
 * There is intentionally no creator-facing HTTP route that issues grants.
 *
 * Future remote tool middleware must first validate the Passport token,
 * issuer/audience/scope, subject, client and consent context, then call
 * authorize() for EVERY invocation. Possession of the connection UUID alone
 * is not authentication.
 */
final class CreatorMcpConnectionRegistry
{
    public function __construct(private readonly CreatorAiAccess $access) {}

    /**
     * @return array{id:string,workspace_id:int,client_id:string,status:string}
     */
    public function recordConsent(
        User $creator,
        int $workspaceId,
        string $clientId,
        ?DateTimeInterface $expiresAt = null,
    ): array {
        $this->access->authorize($creator, $workspaceId, 'mcp');

        if (
            $clientId === '' || trim($clientId) !== $clientId
            || strlen($clientId) > 191 || preg_match('/[[:cntrl:]]/', $clientId)
        ) {
            abort(422, 'Invalid OAuth client identifier.');
        }

        $expiry = $expiresAt === null
            ? CarbonImmutable::now('UTC')->addDays(30)
            : CarbonImmutable::instance($expiresAt)->utc();

        if ($expiry->lessThanOrEqualTo(CarbonImmutable::now('UTC'))
            || $expiry->greaterThan(CarbonImmutable::now('UTC')->addDays(90))) {
            abort(422, 'Invalid MCP consent expiration.');
        }

        return DB::transaction(function () use (
            $creator, $workspaceId, $clientId, $expiry
        ): array {
            // Serialize grant creation for the same authenticated creator.
            $userRow = DB::table('users')
                ->where('id', $creator->getKey())->lockForUpdate()->first(['id']);
            abort_unless($userRow, 403);

            $active = DB::table('creator_ai_mcp_connections')
                ->where('creator_id', $creator->getKey())
                ->where('workspace_id', $workspaceId)
                ->where('oauth_client_id', $clientId)
                ->where('status', 'active')
                ->lockForUpdate()
                ->orderByDesc('consented_at')
                ->first();

            if ($active && CarbonImmutable::parse($active->expires_at, 'UTC')->isFuture()) {
                return [
                    'id' => $active->id,
                    'workspace_id' => (int) $active->workspace_id,
                    'client_id' => $active->oauth_client_id,
                    'status' => 'active',
                ];
            }

            // Keep the historical consent record for audit; never silently
            // resurrect a revoked or expired connection.
            DB::table('creator_ai_mcp_connections')
                ->where('creator_id', $creator->getKey())
                ->where('workspace_id', $workspaceId)
                ->where('oauth_client_id', $clientId)
                ->where('status', 'active')
                ->update([
                    'status' => 'revoked',
                    'revoked_at' => now(),
                    'updated_at' => now(),
                ]);

            $id = (string) Str::uuid();
            DB::table('creator_ai_mcp_connections')->insert([
                'id' => $id,
                'creator_id' => $creator->getKey(),
                'workspace_id' => $workspaceId,
                'oauth_client_id' => $clientId,
                'status' => 'active',
                'consented_at' => now(),
                'expires_at' => $expiry,
                'revoked_at' => null,
                'last_accessed_at' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return [
                'id' => $id,
                'workspace_id' => $workspaceId,
                'client_id' => $clientId,
                'status' => 'active',
            ];
        }, 3);
    }

    /**
     * Must be called AFTER verifying a real OAuth access token. The creator
     * and clientId come from the verified token, never from tool arguments.
     *
     * @return int Workspace ID exclusively from the creator's stored grant.
     */
    public function authorize(User $creator, string $connectionId, string $clientId): int
    {
        abort_unless(
            $creator->exists && Str::isUuid($connectionId) && $clientId !== '',
            403,
        );

        $connection = DB::table('creator_ai_mcp_connections')
            ->where('id', $connectionId)
            ->where('creator_id', $creator->getKey())
            ->where('oauth_client_id', $clientId)
            ->where('status', 'active')
            ->whereNull('revoked_at')
            ->where('expires_at', '>', now())
            ->first(['workspace_id']);

        abort_unless($connection, 403);

        $workspaceId = (int) $connection->workspace_id;

        // Re-evaluate workspace membership and current Verify.et-backed Pro
        // entitlement every time. Revocation/expiry is effective immediately.
        $this->access->authorize($creator, $workspaceId, 'mcp');

        return $workspaceId;
    }

    /** @return list<array<string, int|string|null>> */
    public function list(User $creator): array
    {
        abort_unless($creator->exists, 401);

        return DB::table('creator_ai_mcp_connections')
            ->where('creator_id', $creator->getKey())
            ->orderByDesc('consented_at')
            ->limit(100)
            ->get(['id', 'workspace_id', 'oauth_client_id', 'status', 'consented_at', 'expires_at', 'revoked_at', 'last_accessed_at'])
            ->map(static function ($grant): array {
                $expired = CarbonImmutable::parse($grant->expires_at, 'UTC')->isPast();

                return [
                    'id' => $grant->id,
                    'workspace_id' => (int) $grant->workspace_id,
                    'client_id' => $grant->oauth_client_id,
                    'status' => $grant->status === 'active' && $expired ? 'expired' : $grant->status,
                    'consented_at' => $grant->consented_at,
                    'expires_at' => $grant->expires_at,
                    'revoked_at' => $grant->revoked_at,
                    'last_accessed_at' => $grant->last_accessed_at,
                ];
            })->all();
    }

    /**
     * Revocation is always allowed, including after a creator loses Pro.
     * It immediately denies future authorize() checks, even if the OAuth
     * bearer token has not yet been revoked by the future Passport layer.
     */
    public function revoke(User $creator, string $connectionId): void
    {
        abort_unless($creator->exists && Str::isUuid($connectionId), 404);

        DB::transaction(function () use ($creator, $connectionId): void {
            $owner = DB::table('users')
                ->where('id', $creator->getKey())->lockForUpdate()->first(['id']);
            abort_unless($owner, 404);

            $grant = DB::table('creator_ai_mcp_connections')
                ->where('id', $connectionId)
                ->where('creator_id', $creator->getKey())
                ->lockForUpdate()->first(['id', 'status']);
            abort_unless($grant, 404);

            if ($grant->status !== 'revoked') {
                DB::table('creator_ai_mcp_connections')
                    ->where('id', $connectionId)
                    ->where('creator_id', $creator->getKey())
                    ->update([
                        'status' => 'revoked',
                        'revoked_at' => now(),
                        'updated_at' => now(),
                    ]);
            }
        }, 3);
    }
}
