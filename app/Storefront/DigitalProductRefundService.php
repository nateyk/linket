<?php

namespace App\Storefront;

use App\Payments\Models\PaymentTransaction;
use App\Storefront\Models\DigitalProductPaymentRefund;
use App\Storefront\Models\ProductReview;
use App\Storefront\Models\StorefrontOrder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DigitalProductRefundService
{
    public function record(PaymentTransaction $transaction, int $actorId, array $data): DigitalProductPaymentRefund
    {
        return DB::transaction(function () use ($transaction, $actorId, $data): DigitalProductPaymentRefund {
            $transaction = PaymentTransaction::query()->with(['payable', 'refunds'])->lockForUpdate()->findOrFail($transaction->id);
            if ($transaction->status !== 'paid' || !$transaction->payable instanceof StorefrontOrder) {
                throw ValidationException::withMessages(['transaction' => __('Only paid Digital Product transactions can be refunded.')]);
            }
            $existing = $transaction->refunds->firstWhere('external_reference', $data['external_reference']);
            if ($existing) {
                return $existing;
            }
            /** @var StorefrontOrder $order */
            $order = $transaction->payable()->with('product')->lockForUpdate()->firstOrFail();
            $refunded = (int) $transaction->refunds->sum('amount_cents');
            $amount = (int) $data['amount_cents'];
            if ($amount > $order->gross_amount_cents - $refunded) {
                throw ValidationException::withMessages(['amount_cents' => __('The refund exceeds the remaining paid amount.')]);
            }

            $isFull = $refunded + $amount === $order->gross_amount_cents;
            $earningsAlreadyReversed = (int) $transaction->refunds->sum('creator_earnings_reversal_cents');
            $feesAlreadyReversed = (int) $transaction->refunds->sum('platform_fee_reversal_cents');
            $creatorReversal = $isFull
                ? $order->creator_earnings_cents - $earningsAlreadyReversed
                : (int) round($order->creator_earnings_cents * ($amount / $order->gross_amount_cents));
            $feeReversal = $isFull
                ? $order->platform_fee_cents - $feesAlreadyReversed
                : (int) round($order->platform_fee_cents * ($amount / $order->gross_amount_cents));

            $refund = DigitalProductPaymentRefund::create([
                'payment_transaction_id' => $transaction->id,
                'storefront_order_id' => $order->id,
                'recorded_by' => $actorId,
                'amount_cents' => $amount,
                'creator_earnings_reversal_cents' => $creatorReversal,
                'platform_fee_reversal_cents' => $feeReversal,
                'currency' => $order->currency,
                'external_reference' => $data['external_reference'] ?? null,
                'reason' => $data['reason'],
                'refunded_at' => $data['refunded_at'] ?? now(),
            ]);

            $credit = $order->earningsLedger()->where('entry_type', 'sale')->first();
            app(DigitalProductFinance::class)->record($order->product->workspace_id, $order->creator_id, "refund:{$refund->id}", 'refund', -$creatorReversal, $order->currency, [
                'storefront_order_id' => $order->id,
                'available_at' => $credit?->available_at ?? now(),
                'description' => __('Recorded customer refund'),
                'metadata' => ['refund_id' => $refund->id],
            ]);

            if ($isFull) {
                $order->entitlements()->update(['revoked_at' => now()]);
                ProductReview::query()
                    ->where('storefront_order_id', $order->id)
                    ->delete();
                app(\App\Courses\Services\EnrollmentService::class)->revokeForOrder($order);
            }

            return $refund;
        });
    }
}
