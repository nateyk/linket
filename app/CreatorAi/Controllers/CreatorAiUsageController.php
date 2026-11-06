<?php

namespace App\CreatorAi\Controllers;

use App\CreatorAi\Services\CreatorAiUsageService;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

final class CreatorAiUsageController extends Controller
{
    public function __construct(private readonly CreatorAiUsageService $usage) {}

    public function show(Request $request): JsonResponse
    {
        $creator = $request->user();
        abort_unless($creator instanceof User, 401);

        // Never return provider keys, shared spending budgets, attempt
        // identifiers or another creator's usage.
        return response()->json([
            'data' => $this->usage->summary($creator),
        ])->header('Cache-Control', 'private, no-store');
    }
}
