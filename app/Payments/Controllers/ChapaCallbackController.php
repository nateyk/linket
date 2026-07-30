<?php

namespace App\Payments\Controllers;

use App\Payments\ChapaGateway;
use App\Payments\ChapaPaymentFulfillment;
use App\Payments\Models\PaymentTransaction;
use App\Payments\PaymentVerificationException;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Log;

class ChapaCallbackController extends Controller
{
    public function handle(string $txRef)
    {
        $transaction = PaymentTransaction::query()->where('tx_ref', $txRef)->firstOrFail();
        if ($transaction->status === 'paid') return response()->noContent();

        try {
            app(ChapaPaymentFulfillment::class)->fulfill(
                $transaction,
                app(ChapaGateway::class)->verify($transaction),
            );
        } catch (PaymentVerificationException $e) {
            app(ChapaPaymentFulfillment::class)->recordVerificationFailure($transaction, $e);
            Log::info('Chapa callback verification mismatch.', ['tx_ref' => $txRef, 'reason' => $e->reason]);
        } catch (\Throwable $e) {
            Log::info('Chapa callback is awaiting payment confirmation.', ['tx_ref' => $txRef]);
        }

        return response()->noContent();
    }
}
