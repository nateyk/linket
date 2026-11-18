<?php

namespace App\Storefront\Controllers;

use App\Payments\Chapa\ChapaV2Client;
use App\Storefront\Models\CreatorChapaGateway;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Models\StorefrontPaymentAttempt;
use App\Storefront\Services\StorefrontPaymentVerificationService;
use App\Storefront\Services\StorefrontChapaReturnUrls;
use App\Storefront\StorefrontWebhookHandler;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Response;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Log;

class ChapaStorefrontReturnController extends Controller
{
    public function handle(string $txRef): Response|RedirectResponse
    {
        $attempt = StorefrontPaymentAttempt::query()
            ->where('merchant_reference', $txRef)
            ->first();

        if ($attempt) {
            $this->fulfillPlatformAttempt($attempt, $txRef);

            return $this->respondAfterReturn($attempt->fresh('order')?->order);
        }

        $order = StorefrontOrder::query()
            ->where('chapa_tx_ref', $txRef)
            ->where('payment_gateway', 'chapa')
            ->firstOrFail();

        if ($order->status !== 'paid') {
            $this->fulfillIfVerified($order);
        }

        return $this->respondAfterReturn($order);
    }

    private function respondAfterReturn(?StorefrontOrder $order): Response|RedirectResponse
    {
        if ($order !== null && request()->isMethod('GET') && ! request()->expectsJson()) {
            return redirect()->to(StorefrontChapaReturnUrls::browserSuccessUrl($order->fresh()));
        }

        return response()->noContent();
    }

    private function fulfillPlatformAttempt(StorefrontPaymentAttempt $attempt, string $txRef): void
    {
        if ($attempt->isSuccessful() && $attempt->order?->status === 'paid') {
            return;
        }

        try {
            app(StorefrontPaymentVerificationService::class)->verifyAndFulfill($txRef);
        } catch (\Throwable $exception) {
            Log::info('Platform Chapa return is awaiting payment confirmation.', [
                'tx_ref' => $txRef,
                'error' => $exception->getMessage(),
            ]);
        }
    }

    private function fulfillIfVerified(StorefrontOrder $order): void
    {
        $order->loadMissing('product');
        $gateway = CreatorChapaGateway::query()
            ->where('workspace_id', $order->product?->workspace_id)
            ->first();
        if (!$gateway) {
            return;
        }

        try {
            $data = app(ChapaV2Client::class)->verifyPayment($gateway->secret_key, (string) $order->chapa_tx_ref);
        } catch (\Throwable $exception) {
            Log::info('Seller Chapa return is awaiting payment confirmation.', [
                'tx_ref' => $order->chapa_tx_ref,
                'error' => $exception::class,
            ]);

            return;
        }

        $reference = (string) ($data['merchant_reference'] ?? '');
        $amount = $data['amount'] ?? null;
        $amountCents = is_string($amount) ? ChapaV2Client::centsFromMajor($amount) : (int) $amount;
        if (
            strtolower((string) ($data['status'] ?? '')) !== 'success'
            || $amountCents !== (int) $order->gross_amount_cents
            || strtoupper((string) ($data['currency'] ?? '')) !== 'ETB'
            || $reference === ''
            || !hash_equals((string) $order->chapa_tx_ref, $reference)
        ) {
            return;
        }

        app(StorefrontWebhookHandler::class)->fulfill($order, $order->buyer_email, [
            'payment_gateway' => 'chapa',
            'chapa_tx_ref' => $order->chapa_tx_ref,
        ]);
    }
}
