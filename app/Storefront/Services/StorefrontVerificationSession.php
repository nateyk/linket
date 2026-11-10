<?php

namespace App\Storefront\Services;

use App\Payments\Models\DirectPaymentVerification;
use App\Payments\VerifyEt\ReceiptReference;
use App\Storefront\Models\StorefrontOrder;
use Illuminate\Support\Facades\DB;

final class StorefrontVerificationSession
{
    public function prepareReference(string $bank, string $reference, ?string $accountSuffix = null): string
    {
        return app(ReceiptReference::class)->prepare($bank, $reference, $accountSuffix);
    }

    public function expireIfDue(StorefrontOrder $order): StorefrontOrder
    {
        if (!$this->sessionIsPastDue($order)) {
            return $order;
        }

        $order->update(['status' => StorefrontOrder::STATUS_CANCELLED]);
        $order->refresh();

        return $order;
    }

    public function recordMismatch(StorefrontOrder $order, DirectPaymentVerification $verification): void
    {
        if (!$this->verificationBelongsToOrder($order, $verification)) {
            return;
        }

        DB::transaction(function () use ($order, $verification): void {
            $this->countMismatchAttempt($order, $verification);
        }, 3);

        $order->refresh();
    }

    private function sessionIsPastDue(StorefrontOrder $order): bool
    {
        if ($order->payment_expires_at === null || !$order->payment_expires_at->isPast()) {
            return false;
        }

        return in_array($order->status, ['pending', 'pending_payment', 'verifying', 'failed', 'failed_verification'], true);
    }

    private function verificationBelongsToOrder(StorefrontOrder $order, DirectPaymentVerification $verification): bool
    {
        if ($verification->payable_type !== StorefrontOrder::class) {
            return false;
        }

        return (int) $verification->payable_id === (int) $order->id;
    }

    private function countMismatchAttempt(StorefrontOrder $order, DirectPaymentVerification $verification): void
    {
        $locked = StorefrontOrder::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();
        if ($this->mismatchIsClosed($locked)) {
            return;
        }

        $attemptKey = $verification->getKey().':'.max(1, (int) ($verification->attempt ?? 1));
        if ($locked->last_counted_attempt_key === $attemptKey) {
            return;
        }

        $attempts = (int) ($locked->verification_attempts ?? 0) + 1;
        $locked->forceFill([
            'verification_attempts' => $attempts,
            'last_counted_attempt_key' => $attemptKey,
            'status' => $attempts >= StorefrontOrder::MAX_VERIFICATION_ATTEMPTS
                ? StorefrontOrder::STATUS_CANCELLED
                : StorefrontOrder::STATUS_FAILED,
        ])->save();

        app(CreatorVerificationAllowance::class)->release($locked, 'definitive_verification_mismatch');
    }

    private function mismatchIsClosed(StorefrontOrder $order): bool
    {
        if ($order->isCompleted() || $order->isCancelled()) {
            return true;
        }

        return $order->status === StorefrontOrder::STATUS_MANUAL_REVIEW;
    }
}
