<?php

namespace App\Storefront;

use App\Payments\Chapa\LinketChapaManager;
use App\Payments\Models\PaymentTransaction;
use App\Storefront\Ledger\CreatorLedgerService;
use App\Storefront\Ledger\RefundBreakdown;
use App\Storefront\Models\DigitalProductPaymentRefund;
use App\Storefront\Models\ProductReview;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Services\PlatformOrderRefundRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;

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
                'status' => DigitalProductPaymentRefund::STATUS_COMPLETED,
                'refunded_at' => $data['refunded_at'] ?? now(),
            ]);

            $this->recordLegacyFinanceEntry($order, $refund, $creatorReversal);

            if ($order->isPlatformCollected()) {
                $this->postLedgerRefund(
                    $order,
                    new RefundBreakdown(
                        grossCents: $amount,
                        creatorCents: $creatorReversal,
                        feeCents: $feeReversal,
                        refundId: $refund->id,
                    ),
                );
            }

            if ($isFull) {
                $this->revokeCustomerAccess($order);
            }

            return $refund;
        });
    }

    /**
     * Executes a full or partial refund for a platform-collected storefront order.
     */
    public function refundPlatformOrder(PlatformOrderRefundRequest $request): DigitalProductPaymentRefund
    {
        return DB::transaction(function () use ($request): DigitalProductPaymentRefund {
            /** @var StorefrontOrder $order */
            $order = StorefrontOrder::query()
                ->with(['product', 'refunds', 'latestPaymentAttempt'])
                ->lockForUpdate()
                ->findOrFail($request->order->id);

            $this->validatePlatformOrderForRefund($order);

            $existing = $this->findExistingOrderRefund($order, $request->externalReference);
            if ($existing !== null) {
                return $existing;
            }

            $alreadyRefunded = (int) $order->refunds->sum('amount_cents');
            $this->validateRefundAmount($request->amountCents, (int) $order->gross_amount_cents, $alreadyRefunded);

            $reversals = $this->calculateReversals($order, $request->amountCents, $alreadyRefunded);
            $externalRef = $request->externalReference ?: ('ref_' . Str::random(14));
            $providerRef = null;

            if ($request->callProvider && $order->isPlatformCollected()) {
                $providerRef = $this->executeProviderRefund($order, $request->amountCents, $externalRef, $request->reason);
            }

            $refund = DigitalProductPaymentRefund::create([
                'payment_transaction_id' => null,
                'storefront_order_id' => $order->id,
                'recorded_by' => $request->actorId,
                'amount_cents' => $request->amountCents,
                'creator_earnings_reversal_cents' => $reversals['creator'],
                'platform_fee_reversal_cents' => $reversals['fee'],
                'currency' => $order->currency ?: 'ETB',
                'external_reference' => $externalRef,
                'chapa_refund_reference' => $providerRef,
                'reason' => $request->reason,
                'status' => DigitalProductPaymentRefund::STATUS_COMPLETED,
                'refunded_at' => now(),
            ]);

            $this->recordLegacyFinanceEntry($order, $refund, $reversals['creator']);

            if ($order->isPlatformCollected()) {
                $this->postLedgerRefund(
                    $order,
                    new RefundBreakdown(
                        grossCents: $request->amountCents,
                        creatorCents: $reversals['creator'],
                        feeCents: $reversals['fee'],
                        refundId: $refund->id,
                    ),
                );
            }

            if ($reversals['is_full']) {
                $order->update(['status' => 'refunded']);
                $this->revokeCustomerAccess($order);
            }

            return $refund;
        }, 3);
    }

    private function validatePlatformOrderForRefund(StorefrontOrder $order): void
    {
        if (!$order->isPaid() && $order->status !== 'refunded') {
            throw ValidationException::withMessages(['order' => __('Only paid orders can be refunded.')]);
        }
    }

    private function findExistingOrderRefund(StorefrontOrder $order, ?string $externalReference): ?DigitalProductPaymentRefund
    {
        if ($externalReference === null || trim($externalReference) === '') {
            return null;
        }

        return $order->refunds->firstWhere('external_reference', $externalReference);
    }

    private function validateRefundAmount(int $amountCents, int $grossCents, int $alreadyRefunded): void
    {
        if ($amountCents < 100) {
            throw ValidationException::withMessages(['amount_cents' => __('Refund amount must be at least 100 minor units (1 ETB).')]);
        }

        $remaining = $grossCents - $alreadyRefunded;
        if ($amountCents > $remaining) {
            throw ValidationException::withMessages(['amount_cents' => __('The refund exceeds the remaining paid amount.')]);
        }
    }

    /**
     * @return array{creator: int, fee: int, is_full: bool}
     */
    private function calculateReversals(StorefrontOrder $order, int $amountCents, int $alreadyRefunded): array
    {
        $isFull = ($alreadyRefunded + $amountCents) === (int) $order->gross_amount_cents;
        $earningsAlreadyReversed = (int) $order->refunds->sum('creator_earnings_reversal_cents');
        $feesAlreadyReversed = (int) $order->refunds->sum('platform_fee_reversal_cents');

        $gross = max(1, (int) $order->gross_amount_cents);
        $creatorReversal = $isFull
            ? (int) $order->creator_earnings_cents - $earningsAlreadyReversed
            : (int) round(((int) $order->creator_earnings_cents * $amountCents) / $gross);

        $feeReversal = $isFull
            ? (int) $order->platform_fee_cents - $feesAlreadyReversed
            : (int) round(((int) $order->platform_fee_cents * $amountCents) / $gross);

        return [
            'creator' => $creatorReversal,
            'fee' => $feeReversal,
            'is_full' => $isFull,
        ];
    }

    private function executeProviderRefund(StorefrontOrder $order, int $amountCents, string $reference, string $reason): ?string
    {
        $paymentRef = $order->latestPaymentAttempt?->chapa_reference ?: $order->chapa_tx_ref;
        if (!$paymentRef) {
            return null;
        }

        $client = app(LinketChapaManager::class)->platformClient();
        $response = $client->refunds()->create([
            'payment_reference' => $paymentRef,
            'merchant_reference' => $reference,
            'amount' => $amountCents,
            'reason' => mb_substr($reason, 0, 400),
        ], (string) Str::uuid());

        if (!$response->operationSucceeded()) {
            throw new RuntimeException('Chapa refund rejected: ' . ($response->message() ?? 'Unknown provider error.'));
        }

        $data = $response->data();

        return is_array($data) && is_string($data['reference'] ?? null) ? $data['reference'] : null;
    }

    private function recordLegacyFinanceEntry(StorefrontOrder $order, DigitalProductPaymentRefund $refund, int $creatorReversal): void
    {
        $credit = $order->earningsLedger()->where('entry_type', 'sale')->first();
        app(DigitalProductFinance::class)->record(
            $order->product?->workspace_id,
            $order->creator_id,
            "refund:{$refund->id}",
            'refund',
            -$creatorReversal,
            $order->currency ?: 'ETB',
            [
                'storefront_order_id' => $order->id,
                'available_at' => $credit?->available_at ?? now(),
                'description' => __('Recorded customer refund'),
                'metadata' => ['refund_id' => $refund->id],
            ],
        );
    }

    private function postLedgerRefund(StorefrontOrder $order, RefundBreakdown $breakdown): void
    {
        app(CreatorLedgerService::class)->recordRefund($order, $breakdown);
    }

    private function revokeCustomerAccess(StorefrontOrder $order): void
    {
        $order->entitlements()->update(['revoked_at' => now()]);
        ProductReview::query()
            ->where('storefront_order_id', $order->id)
            ->delete();
        app(\App\Courses\Services\EnrollmentService::class)->revokeForOrder($order);
    }
}
