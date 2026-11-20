<?php

declare(strict_types=1);

namespace App\Storefront\Controllers;

use App\Storefront\ChapaPayoutService;
use App\Storefront\Models\StorefrontPayoutIntent;
use App\Storefront\Services\ChapaTransferApprovalSecret;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Validator;

/**
 * Public server-to-server Chapa v1 transfer approval URL.
 * Return 200 only for a previously approved, matching, durable withdrawal.
 */
final class ChapaV1TransferApprovalController extends Controller
{
    public function __invoke(Request $request, ChapaPayoutService $service): JsonResponse
    {
        if (!app(\App\Storefront\Services\ChapaV1PayoutMode::class)->enabled()) {
            return response()->json(['message' => 'Transfer not approved'], 400);
        }
        $secret = app(ChapaTransferApprovalSecret::class)->current();
        $signature = (string) $request->header('Chapa-Signature', '');

        if (!$this->isValidSignature($secret, $signature)) {
            return response()->json(['message' => 'Transfer not approved'], 400);
        }

        $validator = Validator::make($request->all(), [
            'reference' => ['required', 'string', 'max:190'],
            'amount' => ['required', 'numeric', 'gt:0'],
            'bank' => ['required', 'string', 'max:100'],
            'account_name' => ['required', 'string', 'max:160'],
            'account_number' => ['required', 'string', 'max:100'],
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Transfer not approved'], 400);
        }
        $payload = $validator->validated();

        $intent = StorefrontPayoutIntent::query()
            ->with('payoutRequest')
            ->where('merchant_reference', $payload['reference'])
            ->first();

        if (!$intent || !$service->approvalMatches($intent, $payload)) {
            return response()->json(['message' => 'Transfer not approved'], 400);
        }

        // Idempotent callback: no transfer dispatch and no ledger mutation here.
        return response()->json(['message' => 'Transfer approved'], 200);
    }
    private function isValidSignature(string $secret, string $signature): bool
    {
        if ($secret === '') {
            return false;
        }

        if (preg_match('/^[0-9a-f]{64}$/i', $signature) !== 1) {
            return false;
        }

        // Keep fail-closed until a real Chapa v1 test-mode callback confirms this format.
        return hash_equals(hash_hmac('sha256', $secret, $secret), strtolower($signature));
    }

}
