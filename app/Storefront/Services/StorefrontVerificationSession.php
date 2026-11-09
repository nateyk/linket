<?php

namespace App\Storefront\Services;

use App\Payments\Models\DirectPaymentVerification;
use App\Payments\VerifyEt\ReceiptReference;
use App\Storefront\Models\StorefrontOrder;
use Illuminate\Support\Facades\DB;

final class StorefrontVerificationSession
{
    public function prepareReference(string $bank, string $reference, ?string $accountSuffix = null, ?string $phoneNumber = null): string
    {
        return app(ReceiptReference::class)->prepare($bank, $reference, $accountSuffix, $phoneNumber);
    }

    public function expireIfDue(StorefrontOrder $order): StorefrontOrder
    {
        if (
            $order->payment_expires_at
            && $order->payment_expires_at->isPast()
            && in_array($order->status, ['pending', 'pending_payment', 'verifying', 'failed', 'failed_verification'], true)
        ) {
            $order->update(['status' => StorefrontOrder::STATUS_CANCELLED]);
            $order->refresh();
        }

        return $order;
    }

    public function recordMismatch(StorefrontOrder $order, DirectPaymentVerification $verification): void
    {
        if ($verification->payable_type !== StorefrontOrder::class || (int) $verification->payable_id !== (int) $order->id) {
            return;
        }

        DB::transaction(function () use ($order, $verification): void {
            $locked = StorefrontOrder::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();
            if ($locked->isCompleted() || $locked->status === StorefrontOrder::STATUS_MANUAL_REVIEW || $locked->isCancelled()) {
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
        }, 3);

        $order->refresh();
    }
}
