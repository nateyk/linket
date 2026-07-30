<?php

namespace App\Payments\Controllers;

use App\Payments\ChapaGateway;
use App\Payments\ChapaWebhookDeliveryLogger;
use App\Payments\ChapaPaymentFulfillment;
use App\Payments\Models\PaymentTransaction;
use App\Payments\PaymentVerificationException;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Log;

class ChapaWebhookController extends Controller
{
    public function handle(Request $request)
    {
        $deliveryLogger = app(ChapaWebhookDeliveryLogger::class);
        $signatureIsValid = app(ChapaGateway::class)->signatureIsValid($request);

        if (!$signatureIsValid) {
            $deliveryLogger->record(null, false, 'rejected', 'invalid_signature');
            Log::warning('Rejected Chapa webhook signature.', ['ip' => $request->ip()]);
            return response()->json(['message' => 'Invalid Chapa signature.'], 403);
        }

        $txRef = $request->input('tx_ref')
            ?? $request->input('trx_ref')
            ?? data_get($request->input('data'), 'tx_ref');
        if (!is_string($txRef) || blank($txRef)) {
            $deliveryLogger->record(null, true, 'rejected', 'missing_tx_ref');
            return response()->json(['message' => 'Missing Chapa transaction reference.'], 422);
        }

        $transaction = PaymentTransaction::query()->where('tx_ref', $txRef)->first();
        if (!$transaction) {
            $deliveryLogger->record($txRef, true, 'rejected', 'unknown_tx_ref');
            return response()->json(['message' => 'Unknown transaction.'], 404);
        }
        if ($transaction->status === 'paid') {
            $deliveryLogger->record($txRef, true, 'duplicate');
            return response()->json(['message' => 'Already processed.']);
        }

        try {
            app(ChapaPaymentFulfillment::class)->fulfill(
                $transaction,
                app(ChapaGateway::class)->verify($transaction),
            );
        } catch (PaymentVerificationException $e) {
            app(ChapaPaymentFulfillment::class)->recordVerificationFailure($transaction, $e);
            $deliveryLogger->record($txRef, true, 'failed', $e->reason);
            Log::warning('Chapa payment verification mismatch.', ['tx_ref' => $txRef, 'reason' => $e->reason]);
            return response()->json(['message' => 'Payment verification failed.'], 422);
        } catch (\Throwable $e) {
            $deliveryLogger->record($txRef, true, 'failed', 'verification_error');
            Log::warning('Chapa payment verification failed.', ['tx_ref' => $txRef, 'message' => $e->getMessage()]);
            return response()->json(['message' => 'Payment verification failed.'], 422);
        }

        $deliveryLogger->record($txRef, true, 'fulfilled');

        return response()->json(['message' => 'Payment processed.']);
    }
}
