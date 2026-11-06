<?php

namespace App\CreatorAi\Controllers;

use App\CreatorAi\Auth\CreatorMcpRemoteConfiguration;
use App\CreatorAi\Services\CreatorAiAccess;
use App\CreatorAi\Services\CreatorMcpConnectionRegistry;
use App\Models\User;
use Common\Workspaces\Models\Workspace;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

final class CreatorMcpConnectionsController extends Controller
{
    public function __construct(
        private readonly CreatorMcpConnectionRegistry $connections,
        private readonly CreatorAiAccess $access,
        private readonly CreatorMcpRemoteConfiguration $remote,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $creator = $request->user();
        abort_unless($creator instanceof User, 401);

        // Listing and disconnecting remain possible even after Pro expiry
        // or when remote OAuth is disabled. Readiness is only a display hint;
        // real consent/bearer routes independently authorize every request.
        $setup = $this->connectionSetup($creator);

        return response()->json([
            'data' => [
                'connections' => $this->connections->list($creator),
                'oauth_connection_available' => $setup['status'] === 'ready',
                'connection_setup' => $setup,
            ],
        ])->header('Cache-Control', 'private, no-store');
    }

    public function destroy(Request $request, string $connectionId): Response
    {
        $creator = $request->user();
        abort_unless($creator instanceof User, 401);

        $this->connections->revoke($creator, $connectionId);

        return response()->noContent()->header('Cache-Control', 'private, no-store');
    }

    /** @return array{status:string,resource_url:string|null} */
    private function connectionSetup(User $creator): array
    {
        $unavailable = ['status' => 'unavailable', 'resource_url' => null];

        // All public OAuth/MCP gates are default-off. A partial rollout
        // must not advertise connection readiness or expose an endpoint.
        if (config('creator_ai.enabled') !== true) {
            return $unavailable;
        }
        foreach ([
            'mcp', 'mcp_oauth', 'mcp_http_oauth', 'mcp_http_token',
            'mcp_http_discovery', 'mcp_http_server',
        ] as $flag) {
            if (config('creator_ai.features.'.$flag) !== true) {
                return $unavailable;
            }
        }

        try {
            // Never derive this URL from Host, forwarded headers, or input.
            $endpoints = $this->remote->endpoints();
        } catch (HttpExceptionInterface) {
            return $unavailable;
        }

        $workspaceId = Workspace::query()
            ->forUser((int) $creator->getKey())
            ->orderBy('id')
            ->value('id');
        if (! is_numeric($workspaceId) || (int) $workspaceId < 1) {
            return ['status' => 'workspace_required', 'resource_url' => null];
        }

        if (! $this->access->verifiedPro($creator)) {
            return ['status' => 'verified_pro_required', 'resource_url' => null];
        }

        if (! $this->access->allows($creator, (int) $workspaceId, 'mcp')) {
            return $unavailable;
        }

        try {
            // Only approved public clients with the exact authorization-code
            // grant family are usable. Never expose a synthetic direct-login
            // shortcut, an unregistered callback, or bearer credentials.
            $clients = DB::table('oauth_clients')
                ->where('provider', 'creator_mcp_users')
                ->whereNull('secret')
                ->where('revoked', false)
                ->limit(100)
                ->get(['id', 'grant_types', 'redirect_uris']);
        } catch (QueryException) {
            return $unavailable;
        }

        $approvedClient = $clients->contains(static function ($client): bool {
            $grants = is_string($client->grant_types)
                ? json_decode($client->grant_types, true) : null;
            $redirects = is_string($client->redirect_uris)
                ? json_decode($client->redirect_uris, true) : null;

            return is_string($client->id)
                && Str::isUuid($client->id)
                && is_array($grants)
                && array_is_list($grants)
                && in_array('authorization_code', $grants, true)
                && count(array_filter($grants, 'is_string')) === count($grants)
                && array_diff($grants, ['authorization_code', 'refresh_token']) === []
                && is_array($redirects)
                && array_is_list($redirects)
                && count($redirects) > 0
                && collect($redirects)->contains(
                    static fn ($uri): bool => is_string($uri)
                        && str_starts_with($uri, 'https://')
                        && filter_var($uri, FILTER_VALIDATE_URL) !== false
                );
        });

        if (! $approvedClient) {
            return ['status' => 'admin_setup_required', 'resource_url' => null];
        }

        return ['status' => 'ready', 'resource_url' => $endpoints['resource']];
    }
}
