<?php

namespace App\CreatorAi\Controllers;

use App\CreatorAi\Services\CreatorMcpConnectionRegistry;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Symfony\Component\HttpFoundation\Response;

final class CreatorMcpConnectionsController extends Controller
{
    public function __construct(
        private readonly CreatorMcpConnectionRegistry $connections,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $creator = $request->user();
        abort_unless($creator instanceof User, 401);

        // A creator may still see and disconnect old connections after Pro
        // expiry or when MCP is globally disabled.
        return response()->json([
            'data' => [
                'connections' => $this->connections->list($creator),
                'oauth_connection_available' => false,
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
}
