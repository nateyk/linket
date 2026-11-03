<?php

namespace App\CreatorAi\Auth;

use App\CreatorAi\Services\CreatorAiAccess;
use App\CreatorAi\Services\CreatorMcpConnectionRegistry;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Session\Store;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

/**
 * Internal browser-only consent boundary for future Passport OAuth authorization.
 *
 * A valid Passport token with previously approved scopes is NEVER consent.
 * Only a fresh web-authenticated browser request with a one-use session nonce,
 * matching CSRF token and explicit eligible workspace selection can record the
 * scoped local grant. This service deliberately does not issue authorization
 * codes, bearer/refresh tokens or expose any HTTP routes.
 *
 * When wired to real HTTP, the authorization controller MUST use this service
 * instead of Passport's AuthorizationController auto-approval shortcut.
 * Use web CSRF middleware and session blocking in that future route, and
 * independently validate the Passport authorization request/token/resource.
 */
final class CreatorMcpOAuthConsentFlow
{
    private const SESSION_KEY = 'creator_ai.oauth.pending';

    private const LIFETIME_SECONDS = 600;

    public function __construct(
        private readonly CreatorMcpOAuthAuthorizationPolicy $policy,
        private readonly CreatorAiAccess $access,
        private readonly CreatorMcpConnectionRegistry $connections,
    ) {}

    /**
     * Begin a new consent request tied to this specific creator's web session.
     * Starting over replaces any previous pending request in that session.
     *
     * @param array<string,mixed> $oauthParameters
     * @return array{client_id:string,nonce:string,expires_at:int}
     */
    public function begin(Request $request, array $oauthParameters): array
    {
        [$creator, $session] = $this->webIdentityAndSession($request);

        $authorization = $this->policy->validate($oauthParameters);
        abort_unless($this->access->verifiedPro($creator), 403);

        $nonce = Str::random(48);
        $expiresAt = now()->addSeconds(self::LIFETIME_SECONDS)->timestamp;

        // No bearer tokens, signing keys or OAuth code verifiers are stored.
        // The client-supplied state is not a replacement for browser CSRF.
        $session->put(self::SESSION_KEY, [
            'creator_id' => (int) $creator->getKey(),
            'authorization' => $authorization,
            'nonce_hash' => hash('sha256', $nonce),
            'csrf_hash' => hash('sha256', $session->token()),
            'expires_at' => $expiresAt,
        ]);

        return [
            'client_id' => $authorization['client_id'],
            'nonce' => $nonce,
            'expires_at' => $expiresAt,
        ];
    }

    /**
     * Only an explicit, fresh POST approval for ONE eligible workspace grants
     * consent. The pending request is consumed before any database mutation,
     * so reusing the same nonce cannot create additional grants.
     *
     * @return array{connection:array{id:string,workspace_id:int,client_id:string,status:string},authorization:array<string,string>}
     */
    public function approve(Request $request, string $nonce, int $workspaceId): array
    {
        [$creator, $authorization] = $this->consume($request, $nonce);

        // The OAuth client, resource and flags may have changed since begin().
        // Rechecking also prevents a previously issued Passport token from
        // silently satisfying the mandatory Linket workspace consent.
        $validated = $this->policy->validate($authorization);
        $this->access->authorize($creator, $workspaceId, 'mcp');

        $connection = $this->connections->recordConsent(
            $creator,
            $workspaceId,
            $validated['client_id'],
        );

        return [
            'connection' => $connection,
            'authorization' => $validated,
        ];
    }

    /** Cancel consent without issuing a connection or OAuth credentials. */
    public function deny(Request $request, string $nonce): void
    {
        $this->consume($request, $nonce);
    }

    /**
     * @return array{0:User,1:array<string,string>}
     */
    private function consume(Request $request, string $nonce): array
    {
        [$creator, $session] = $this->webIdentityAndSession($request);

        // Defense in depth: the future HTTP route must ALSO use Laravel's
        // standard web CSRF middleware. Never accept a nonce by itself.
        $csrf = $request->input('_token');
        if (! is_string($csrf)) {
            $csrf = $request->header('X-CSRF-TOKEN');
        }

        abort_unless(
            is_string($csrf)
            && $csrf !== ''
            && hash_equals($session->token(), $csrf),
            403,
        );

        // Pull removes the pending request even when a later check fails.
        // No old OAuth access token or prior consent record is consulted.
        $pending = $session->pull(self::SESSION_KEY);

        abort_unless(
            is_array($pending)
            && is_int($pending['creator_id'] ?? null)
            && $pending['creator_id'] === (int) $creator->getKey()
            && is_int($pending['expires_at'] ?? null)
            && $pending['expires_at'] > now()->timestamp
            && is_string($pending['nonce_hash'] ?? null)
            && is_string($pending['csrf_hash'] ?? null)
            && is_array($pending['authorization'] ?? null)
            && strlen($nonce) === 48
            && hash_equals($pending['nonce_hash'], hash('sha256', $nonce))
            && hash_equals($pending['csrf_hash'], hash('sha256', $session->token())),
            403,
            'Invalid or expired OAuth consent request.',
        );

        return [$creator, $pending['authorization']];
    }

    /**
     * Accept only a real Linket browser-authenticated user and live session.
     * Never derive creator identity from a client-supplied ID, OAuth scope,
     * Sanctum API token or MCP tool argument.
     *
     * @return array{0:User,1:Store}
     */
    private function webIdentityAndSession(Request $request): array
    {
        $creator = Auth::guard('web')->user();
        abort_unless($creator instanceof User && $creator->exists, 401);

        abort_unless($request->hasSession(), 403);

        $session = $request->session();
        abort_unless(
            $session instanceof Store
            && $session->isStarted()
            && is_string($session->token())
            && $session->token() !== '',
            403,
        );

        return [$creator, $session];
    }
}
