<?php

declare(strict_types=1);

namespace App\Storefront\Controllers;

use App\Storefront\ChapaPayoutService;
use App\Storefront\Models\StorefrontPayoutIntent;
use App\Storefront\Services\ChapaTransferApprovalSecret;
use App\Storefront\Services\ChapaV1PayoutMode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

/**
 * Public server-to-server Chapa v1 transfer approval URL.
 * Return 200 only for a previously approved, matching, durable withdrawal.
 */
final class ChapaV1TransferApprovalController extends Controller
{
    public function __invoke(Request $request, ChapaPayoutService $service): JsonResponse
    {
        if (!app(ChapaV1PayoutMode::class)->enabled()) {
            return $this->reject('payouts_disabled');
        }
        $secret = app(ChapaTransferApprovalSecret::class)->current();
        $signature = (string) $request->header('Chapa-Signature', '');

        if ($secret === '') {
            return $this->reject('approval_secret_missing');
        }
        if (!$this->isValidSignature($secret, $signature)) {
            return $this->reject($signature === '' ? 'signature_missing' : 'signature_invalid');
        }

        $validator = Validator::make($request->all(), [
            'reference' => ['required', 'string', 'max:190'],
            'amount' => ['required', 'numeric', 'gt:0'],
            'bank' => ['required', 'string', 'max:100'],
            'account_name' => ['nullable', 'string', 'max:160'],
            'account_number' => ['required', 'string', 'max:100'],
        ]);

        if ($validator->fails()) {
            return $this->reject('invalid_payload', ['fields' => array_keys($validator->failed())]);
        }
        $payload = $validator->validated();

        $intent = StorefrontPayoutIntent::query()
            ->with('payoutRequest')
            ->where('merchant_reference', $payload['reference'])
            ->first();

        if (!$intent) {
            return $this->reject('intent_not_found');
        }
        $reason = $service->approvalMismatchReason($intent, $payload);
        if ($reason !== null) {
            return $this->reject($reason, ['intent_id' => $intent->id]);
        }

        // Idempotent callback: no transfer dispatch and no ledger mutation here.
        return response()->json(['message' => 'Transfer approved'], 200);
    }

    /** @param array{fields?: list<string>, intent_id?: int} $context */
    private function reject(string $reason, array $context = []): JsonResponse
    {
        Log::warning('chapa.transfer_approval_rejected', ['reason' => $reason, ...$context]);

        return response()->json(['message' => 'Transfer not approved'], 400);
    }

    private function isValidSignature(string $secret, string $signature): bool
    {
        if (preg_match('/^[0-9a-f]{64}$/i', $signature) !== 1) {
            return false;
        }

        // Chapa v1 signs the approval secret using the same secret as the key.
        return hash_equals(
            hash_hmac('sha256', $secret, $secret),
            strtolower($signature),
        );
    }

}
