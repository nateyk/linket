<?php

namespace App\CreatorAi\Controllers;

use App\CreatorAi\Storefront\CreatorStorefrontProposalService;
use App\Models\User;
use App\Stores\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

final class CreatorStorefrontProposalController extends Controller
{
    public function __construct(private readonly CreatorStorefrontProposalService $service) {}

    public function availability(Request $request, Store $store): JsonResponse
    {
        $creator = $request->user();
        abort_unless($creator instanceof User, 401);
        abort_unless((int) $store->user_id === (int) $creator->getKey(), 404);

        return $this->privateJson([
            'available' => $this->service->available($creator, $store),
        ]);
    }

    public function propose(Request $request, Store $store): JsonResponse
    {
        $creator = $request->user();
        abort_unless($creator instanceof User, 401);
        $data = $request->validate([
            'intent' => ['required', 'string', 'min:4', 'max:160'],
        ]);

        return $this->privateJson($this->service->propose($creator, $store, $data['intent']));
    }

    public function verifyRevision(Request $request, Store $store): JsonResponse
    {
        $creator = $request->user();
        abort_unless($creator instanceof User, 401);
        $data = $request->validate([
            'source_fingerprint' => ['required', 'regex:/^[a-f0-9]{64}$/D'],
        ]);
        $this->service->verifyRevision($creator, $store, $data['source_fingerprint']);

        return $this->privateJson(['unchanged' => true]);
    }

    /** @param array<string,mixed> $data */
    private function privateJson(array $data): JsonResponse
    {
        return response()->json(['data' => $data])
            ->header('Cache-Control', 'private, no-store');
    }
}
