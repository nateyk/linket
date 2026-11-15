<?php

declare(strict_types=1);

namespace App\Storefront\Services;

use App\Payments\Chapa\LinketChapaManager;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Models\StorefrontPaymentAttempt;
use App\Storefront\StorefrontWebhookHandler;
use Illuminate\Support\Facades\DB;
use Nateyk\Chapa\Dto\VerifiedTransaction;
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
        if ($attempt->isSuccessful() && $order?->status === 'paid') {
            return $order;
        }

        $verified = $this->manager()
            ->platformClient()
            ->payments()
            ->verifyTyped($merchantReference);

        if (!$verified->matchesPayment($attempt->amount_cents, $attempt->currency, $merchantReference)) {
            $this->recordVerificationFailure($attempt, $verified);
            throw new RuntimeException('Payment verification mismatch: unexpected status, amount, or currency.');
        }

        return DB::transaction(function () use ($attempt, $merchantReference, $verified): StorefrontOrder {
            $lockedAttempt = StorefrontPaymentAttempt::query()
                ->whereKey($attempt->id)
                ->lockForUpdate()
                ->firstOrFail();

            $order = $lockedAttempt->order()->lockForUpdate()->firstOrFail();
            if ($lockedAttempt->isSuccessful() && $order->status === 'paid') {
                return $order;
            }

            $this->recordVerificationSuccess($lockedAttempt, $verified);
            $buyerEmail = is_string($verified->raw['email'] ?? null) ? $verified->raw['email'] : $order->buyer_email;

            $this->handler()->fulfill($order, $buyerEmail, [
                'payment_gateway' => 'chapa',
                'chapa_tx_ref' => $merchantReference,
            ]);

            return $order->fresh();
        }, 3);
    }

    private function recordVerificationSuccess(StorefrontPaymentAttempt $attempt, VerifiedTransaction $verified): void
    {
        $attempt->update([
            'status' => StorefrontPaymentAttempt::STATUS_SUCCESSFUL,
            'chapa_reference' => $verified->chapaReference,
            'verified_at' => now(),
            'verification_data' => $verified->raw,
        ]);
    }

    private function recordVerificationFailure(StorefrontPaymentAttempt $attempt, VerifiedTransaction $verified): void
    {
        $attempt->update([
            'status' => StorefrontPaymentAttempt::STATUS_FAILED,
            'verification_data' => $verified->raw,
            'error_message' => "Verification mismatch: status={$verified->status}, amount={$verified->amount}, currency={$verified->currency}",
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
