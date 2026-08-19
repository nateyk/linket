<?php

namespace App\Payments;

use App\Payments\Models\ChapaWebhookDelivery;

class ChapaWebhookDeliveryLogger
{
    public function record(
        ?string $txRef,
        bool $signatureValid,
        string $status,
        ?string $failureReason = null,
    ): void {
        ChapaWebhookDelivery::create([
            'tx_ref' => $this->sanitizeReference($txRef),
            'signature_valid' => $signatureValid,
            'status' => $status,
            'failure_reason' => $this->sanitizeReason($failureReason),
            'received_at' => now(),
        ]);
    }

    private function sanitizeReference(?string $txRef): ?string
    {
        if (!is_string($txRef) || blank($txRef)) {
            return null;
        }

        $reference = preg_replace('/[^A-Za-z0-9._-]/', '', $txRef);

        return filled($reference) ? substr($reference, 0, 120) : null;
    }

    private function sanitizeReason(?string $reason): ?string
    {
        return match ($reason) {
            'invalid_signature',
            'missing_tx_ref',
            'unknown_tx_ref',
            'payment_not_successful',
            'amount_mismatch',
            'currency_mismatch',
            'verification_error' => $reason,
            default => null,
        };
    }
}
