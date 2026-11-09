<?php

namespace App\Payments\VerifyEt;

use App\Payments\Models\DirectPaymentVerification;
use App\Payments\Models\ProSubscriptionPayment;
use App\Storefront\Models\CommissionInvoice;
use App\Storefront\Models\CreatorPaymentMethod;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Services\DirectStorefrontFulfillment;
use Common\Billing\Models\Price;
use Common\Billing\Subscription;
use Illuminate\Support\Str;

final class VerifyEtSettlementHandler
{
    public function __construct(
        private readonly VerifyEtIdentityResolver $identityResolver,
    ) {}

    /**
     * Check whether the payable is currently eligible for verification settlement.
     */
    public function canBeSettled(DirectPaymentVerification $verification): bool
    {
        if (strtoupper($verification->currency) !== 'ETB') {
            return false;
        }

        return match ($verification->payable_type) {
            StorefrontOrder::class => $this->isEligibleOrder($verification),
            CommissionInvoice::class => $this->isEligibleInvoice($verification),
            ProSubscriptionPayment::class => $this->isEligibleProPayment($verification),
            default => false,
        };
    }

    /**
     * Settle the payable upon successful verification.
     *
     * @param array{creator_id: int, subscription_id: int, payment_id: int, event: string}|null $proLifecycle
     */
    public function settle(DirectPaymentVerification $verification, ?array &$proLifecycle = null): bool
    {
        return match ($verification->payable_type) {
            StorefrontOrder::class => $this->settleOrder($verification),
            CommissionInvoice::class => $this->settleCommissionInvoice($verification->payable_id),
            ProSubscriptionPayment::class => $this->settleProPayment($verification->payable_id, $proLifecycle),
            default => false,
        };
    }

    private function isEligibleOrder(DirectPaymentVerification $verification): bool
    {
        $order = StorefrontOrder::query()->whereKey($verification->payable_id)
            ->whereIn('status', ['pending_payment', 'verifying', 'failed_verification', 'manual_review', 'expired'])
            ->lockForUpdate()
            ->first();

        if ($order === null) {
            return false;
        }

        if ($order->status === 'expired' && $order->monetization_policy === null) {
            return false;
        }

        if ($order->payment_gateway !== 'verify_et' || $order->gross_amount_cents !== $verification->amount_cents) {
            return false;
        }

        if (strtoupper((string) $order->currency) !== strtoupper($verification->currency)) {
            return false;
        }

        if (strtolower((string) $order->payment_provider_snapshot) !== strtolower($verification->bank_code)) {
            return false;
        }

        if (!is_string($order->payment_account_snapshot) || $order->creator_payment_method_id === null) {
            return false;
        }

        $methodSuspended = CreatorPaymentMethod::query()
            ->whereKey($order->creator_payment_method_id)
            ->where('is_suspended', true)
            ->exists();

        if ($methodSuspended) {
            return false;
        }

        return $this->identityResolver->accountMatches(
            $order->payment_account_snapshot,
            $verification->settlement_account,
            $verification->bank_code,
        );
    }

    private function isEligibleInvoice(DirectPaymentVerification $verification): bool
    {
        return CommissionInvoice::query()
            ->whereKey($verification->payable_id)
            ->whereIn('status', ['pending', 'overdue'])
            ->where('commission_fee_cents', $verification->amount_cents)
            ->lockForUpdate()
            ->exists();
    }

    private function isEligibleProPayment(DirectPaymentVerification $verification): bool
    {
        return ProSubscriptionPayment::query()
            ->whereKey($verification->payable_id)
            ->where('status', 'pending_payment')
            ->where('amount_cents', $verification->amount_cents)
            ->lockForUpdate()
            ->exists();
    }

    private function settleOrder(DirectPaymentVerification $verification): bool
    {
        return app(DirectStorefrontFulfillment::class)->fulfill($verification->payable);
    }

    private function settleCommissionInvoice(int|string $payableId): bool
    {
        return CommissionInvoice::query()
            ->whereKey($payableId)
            ->lockForUpdate()
            ->whereIn('status', ['pending', 'overdue'])
            ->update(['status' => 'paid', 'paid_at' => now()]) === 1;
    }

    /**
     * @param array{creator_id: int, subscription_id: int, payment_id: int, event: string}|null $proLifecycle
     */
    private function settleProPayment(int|string $payableId, ?array &$proLifecycle): bool
    {
        $payment = ProSubscriptionPayment::query()->whereKey($payableId)->lockForUpdate()->firstOrFail();
        if ($payment->status === 'paid') {
            return false;
        }

        $price = $this->resolveProPrice($payment);
        $subscription = Subscription::query()
            ->where('user_id', $payment->creator_id)
            ->where('gateway_name', 'verify_et')
            ->whereNull('ends_at')
            ->lockForUpdate()
            ->latest('id')
            ->first();

        $wasRenewal = $subscription !== null;
        $periodStart = $this->resolveSubscriptionPeriodStart($payment, $subscription);
        $periodEnd = $periodStart->copy()->addMonthNoOverflow();

        if ($subscription) {
            $subscription->update([
                'product_id' => $payment->product_id,
                'price_id' => $price->id,
                'gateway_status' => 'active',
                'renews_at' => $periodEnd,
            ]);
        } else {
            $subscription = Subscription::query()->create([
                'user_id' => $payment->creator_id,
                'product_id' => $payment->product_id,
                'price_id' => $price->id,
                'gateway_name' => 'verify_et',
                'gateway_id' => $payment->uuid,
                'gateway_status' => 'active',
                'renews_at' => $periodEnd,
            ]);
        }

        $payment->update([
            'status' => 'paid',
            'paid_at' => now(),
            'receipt_number' => $payment->receipt_number ?? 'LINKET-' . Str::upper((string) Str::ulid()),
            'subscription_period_start' => $periodStart,
            'subscription_period_end' => $periodEnd,
        ]);

        $proLifecycle = [
            'creator_id' => $payment->creator_id,
            'subscription_id' => $subscription->id,
            'payment_id' => $payment->id,
            'event' => $wasRenewal ? 'renewed' : 'activated',
        ];

        return true;
    }

    private function resolveProPrice(ProSubscriptionPayment $payment): Price
    {
        if ($payment->price_id) {
            return Price::query()->where('product_id', $payment->product_id)->findOrFail($payment->price_id);
        }

        return Price::query()
            ->where('product_id', $payment->product_id)
            ->where('currency', 'ETB')
            ->whereRaw('ROUND(amount * 100) = ?', [$payment->amount_cents])
            ->orderByDesc('default')
            ->firstOrFail();
    }

    private function resolveSubscriptionPeriodStart(ProSubscriptionPayment $payment, ?Subscription $subscription): \Carbon\Carbon
    {
        if ($subscription?->renews_at?->isFuture()) {
            return $subscription->renews_at->copy();
        }

        if ($payment->subscription_period_end?->isFuture()) {
            return $payment->subscription_period_end->copy();
        }

        return now();
    }
}
