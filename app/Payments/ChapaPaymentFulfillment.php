<?php

namespace App\Payments;

use App\Payments\Models\PaymentTransaction;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\StorefrontWebhookHandler;
use Carbon\Carbon;
use Common\Billing\Invoices\Invoice;
use Common\Billing\Models\Price;
use Common\Billing\Subscription;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class ChapaPaymentFulfillment
{
    public function fulfill(PaymentTransaction $transaction, array $verification): void
    {
        DB::transaction(function () use ($transaction, $verification): void {
            $transaction = PaymentTransaction::query()
                ->with('payable')
                ->lockForUpdate()
                ->findOrFail($transaction->id);

            if ($transaction->status === 'paid') return;

            $data = app(ChapaGateway::class)->verifiedData($verification);
            $amount = number_format((float) (Arr::get($data, 'amount') ?? 0), 2, '.', '');
            $currency = strtoupper((string) Arr::get($data, 'currency'));
            if (!app(ChapaGateway::class)->isSuccessful($data)) {
                $status = strtolower((string) Arr::get($data, 'status'));
                throw new PaymentVerificationException(
                    'payment_not_successful',
                    in_array($status, ['failed', 'cancelled'], true),
                );
            }
            $verifiedReference = Arr::get($data, 'tx_ref');
            if (
                filled($verifiedReference) &&
                !hash_equals($transaction->tx_ref, (string) $verifiedReference)
            ) {
                throw new PaymentVerificationException('transaction_reference_mismatch', true);
            }
            if ($amount !== number_format((float) $transaction->amount, 2, '.', '')) {
                throw new PaymentVerificationException('amount_mismatch', true);
            }
            if ($currency !== $transaction->currency) {
                throw new PaymentVerificationException('currency_mismatch', true);
            }

            $transaction->update([
                'status' => 'paid',
                'buyer_email' => Arr::get($data, 'email') ?: $transaction->buyer_email,
                'buyer_name' => $transaction->buyer_name,
                'gateway_transaction_id' => (string) (Arr::get($data, 'id') ?? Arr::get($data, 'transaction_id') ?? $transaction->tx_ref),
                'verification_data' => Arr::only($data, ['id', 'tx_ref', 'amount', 'currency', 'status', 'email', 'first_name', 'last_name']),
                'verified_at' => now(),
            ]);

            match ($transaction->payable::class) {
                StorefrontOrder::class => $this->fulfillStorefrontOrder($transaction, $data),
                Subscription::class => $this->fulfillSubscription($transaction),
                default => throw new RuntimeException('Unsupported Chapa payment target.'),
            };
        });
    }

    public function recordVerificationFailure(
        PaymentTransaction $transaction,
        PaymentVerificationException $exception,
    ): void {
        if (!$exception->shouldMarkFailed) {
            return;
        }

        PaymentTransaction::query()
            ->whereKey($transaction->id)
            ->where('status', '!=', 'paid')
            ->update([
                'status' => 'failed',
                'verification_data' => ['failure_reason' => $exception->reason],
            ]);
    }

    private function fulfillStorefrontOrder(PaymentTransaction $transaction, array $data): void
    {
        /** @var StorefrontOrder $order */
        $order = $transaction->payable()->lockForUpdate()->firstOrFail();
        app(StorefrontWebhookHandler::class)->fulfill($order, Arr::get($data, 'email'), [
            'payment_gateway' => 'chapa',
            'chapa_tx_ref' => $transaction->tx_ref,
        ]);
    }

    private function fulfillSubscription(PaymentTransaction $transaction): void
    {
        /** @var Subscription $subscription */
        $subscription = $transaction->payable()->lockForUpdate()->firstOrFail();
        $price = $subscription->pending_price_id
            ? Price::findOrFail($subscription->pending_price_id)
            : $subscription->price;

        if (strtolower((string) $price->currency) !== 'etb') {
            throw new RuntimeException('Chapa subscription prices must be configured in ETB.');
        }

        $subscription->update([
            'product_id' => $subscription->pending_product_id ?? $subscription->product_id,
            'price_id' => $price->id,
            'pending_product_id' => null,
            'pending_price_id' => null,
            'gateway_name' => 'chapa',
            'gateway_id' => $transaction->tx_ref,
            'gateway_status' => 'active',
            'ends_at' => null,
            'renews_at' => $this->nextRenewalAt($price),
        ]);

        Invoice::create([
            'uuid' => (string) Str::uuid(),
            'subscription_id' => $subscription->id,
            'status' => Invoice::STATUS_PAID,
            'amount_paid' => (int) round(((float) $price->amount) * 100),
            'currency' => 'etb',
        ]);
    }

    private function nextRenewalAt(Price $price): Carbon
    {
        return match (strtolower((string) $price->interval)) {
            'day', 'days' => now()->addDays(max(1, (int) $price->interval_count)),
            'week', 'weeks' => now()->addWeeks(max(1, (int) $price->interval_count)),
            'year', 'years' => now()->addYears(max(1, (int) $price->interval_count)),
            default => now()->addMonths(max(1, (int) $price->interval_count)),
        };
    }
}
