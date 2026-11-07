<?php

namespace App\CreatorAi\Controllers;

use App\CreatorAi\Writing\CreatorProductCopyDraftService;
use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

final class CreatorProductCopyController extends Controller
{
    public function __construct(private readonly CreatorProductCopyDraftService $drafts) {}

    public function availability(Request $request, DigitalProduct $digitalProduct): JsonResponse
    {
        $creator = $request->user();
        abort_unless($creator instanceof User, 401);

        // Do not reveal another creator's product existence via availability.
        abort_unless((int) $digitalProduct->user_id === (int) $creator->getKey(), 404);

        return $this->privateJson(['available' => $this->drafts->available($creator, $digitalProduct)]);
    }

    public function propose(Request $request, DigitalProduct $digitalProduct): JsonResponse
    {
        $creator = $request->user();
        abort_unless($creator instanceof User, 401);
        $data = $request->validate([
            'tone' => ['sometimes', 'in:clear,warm,bold'],
            'language' => ['sometimes', 'in:en,am'],
        ]);

        return $this->privateJson($this->drafts->propose(
            $creator, $digitalProduct, $data['tone'] ?? 'clear', $data['language'] ?? 'en'
        ));
    }

    public function validateRevision(Request $request, DigitalProduct $digitalProduct): JsonResponse
    {
        $creator = $request->user();
        abort_unless($creator instanceof User, 401);
        $data = $request->validate([
            'source_fingerprint' => ['required', 'regex:/^[a-f0-9]{64}$/D'],
        ]);
        $this->drafts->verifyRevision($creator, $digitalProduct, $data['source_fingerprint']);

        return $this->privateJson(['unchanged' => true]);
    }

    /** @param array<string, mixed> $value */
    private function privateJson(array $value): JsonResponse
    {
        return response()->json(['data' => $value])
            ->header('Cache-Control', 'private, no-store');
    }
}
