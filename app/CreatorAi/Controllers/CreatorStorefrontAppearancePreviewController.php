<?php

namespace App\CreatorAi\Controllers;

use App\CreatorAi\Storefront\StorefrontAppearanceProposalService;
use App\Models\User;
use App\Stores\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

final class CreatorStorefrontAppearancePreviewController extends Controller
{
    public function __construct(private readonly StorefrontAppearanceProposalService $proposals) {}

    public function show(Request $request, Store $store): JsonResponse
    {
        $creator = $request->user();
        abort_unless($creator instanceof User, 401);
        $validated = $request->validate(['preset' => ['required', 'in:calm,clear,profile']]);

        return $this->privateJson($this->proposals->preview($creator, $store, $validated['preset']));
    }

    public function verifyRevision(Request $request, Store $store): JsonResponse
    {
        $creator = $request->user();
        abort_unless($creator instanceof User, 401);
        $validated = $request->validate([
            'source_fingerprint' => ['required', 'regex:/^[a-f0-9]{64}$/D'],
        ]);
        $this->proposals->verifyRevision($creator, $store, $validated['source_fingerprint']);

        return $this->privateJson(['unchanged' => true, 'read_only' => true]);
    }

    /** @param array<string,mixed> $payload */
    private function privateJson(array $payload): JsonResponse
    {
        return response()->json(['data' => $payload])
            ->header('Cache-Control', 'private, no-store');
    }
}
