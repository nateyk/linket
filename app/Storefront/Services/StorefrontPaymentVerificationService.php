<?php

declare(strict_types=1);

namespace App\Storefront\Services;

use App\Payments\Chapa\ChapaV2Client;
use App\Payments\Chapa\LinketChapaManager;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Models\StorefrontPaymentAttempt;
use App\Storefront\StorefrontWebhookHandler;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class StorefrontPaymentVerificationService
{
    public function __construct(
        private readonly ?LinketChapaManager $chapaManager = null,
        private readonly ?StorefrontWebhookHandler $webhookHandler = null,
    ) {
    }

    public function verifyAndFulfill(string $merchantReference): StorefrontOrder
    {
        $attempt = StorefrontPaymentAttempt::query()
            ->where('merchant_reference', $merchantReference)
            ->firstOrFail();

        $order = $attempt->order;
        if ($order?->status === 'refunded' || ($attempt->isSuccessful() && $order?->isCompleted())) {
            return $order;
        }

        $verified = $this->verify($merchantReference);
        $status = strtoupper((string) ($verified['status'] ?? ''));

        if ($status === 'PENDING') {
            throw new RuntimeException('Payment verification is pending.');
        }

        $amountCents = ChapaV2Client::centsFromMajor((string) ($verified['amount'] ?? '0'));
        $currency = strtoupper((string) ($verified['currency'] ?? ''));
        $reference = (string) ($verified['merchant_reference'] ?? '');
        $matches = $status === 'SUCCESS'
            && $amountCents === (int) $attempt->amount_cents
            && $currency === strtoupper((string) $attempt->currency)
            && $reference !== ''
            && hash_equals($reference, $merchantReference);

        if (!$matches) {
            $this->recordVerificationFailure($attempt, $verified, $status, $amountCents, $currency);
            throw new RuntimeException('Payment verification mismatch: unexpected status, amount, or currency.');
        }

        return DB::transaction(function () use ($attempt, $merchantReference, $verified): StorefrontOrder {
            $lockedAttempt = StorefrontPaymentAttempt::query()
                ->whereKey($attempt->id)
                ->lockForUpdate()
                ->firstOrFail();

            $order = $lockedAttempt->order()->lockForUpdate()->firstOrFail();
            if ($order->status === 'refunded' || ($lockedAttempt->isSuccessful() && $order->isCompleted())) {
                return $order;
            }

            $this->recordVerificationSuccess($lockedAttempt, $verified);
            $buyerEmail = is_string($verified['email'] ?? null) ? $verified['email'] : $order->buyer_email;

            $this->handler()->fulfill($order, $buyerEmail, [
                'payment_gateway' => 'chapa',
                'chapa_tx_ref' => $merchantReference,
            ]);

            return $order->fresh();
        }, 3);
    }

    /** @return array<string, mixed> */
    private function verify(string $merchantReference): array
    {
        return app(ChapaV2Client::class)->verifyPayment(
            (string) $this->manager()->platformSecret(),
            $merchantReference,
        );
    }

    /** @param array<string, mixed> $verified */
    private function recordVerificationSuccess(StorefrontPaymentAttempt $attempt, array $verified): void
    {
        $attempt->update([
            'status' => StorefrontPaymentAttempt::STATUS_SUCCESSFUL,
            'chapa_reference' => $verified['chapa_reference'] ?? null,
            'verified_at' => now(),
            'verification_data' => $verified,
            'error_message' => null,
        ]);
    }

    /** @param array<string, mixed> $verified */
    private function recordVerificationFailure(
        StorefrontPaymentAttempt $attempt,
        array $verified,
        string $status,
        int $amountCents,
        string $currency,
    ): void {
        // Never clobber a concurrent successful verification / paid attempt.
        StorefrontPaymentAttempt::query()
            ->whereKey($attempt->id)
            ->where('status', '!=', StorefrontPaymentAttempt::STATUS_SUCCESSFUL)
            ->update([
                'status' => StorefrontPaymentAttempt::STATUS_FAILED,
                'verification_data' => $verified,
                'error_message' => "Verification mismatch: status={$status}, amount={$amountCents}, currency={$currency}",
            ]);
    }

    private function manager(): LinketChapaManager
    {
        return $this->chapaManager ?? app(LinketChapaManager::class);
    }

    private function handler(): StorefrontWebhookHandler
    {
        return $this->webhookHandler ?? app(StorefrontWebhookHandler::class);
    }
}
