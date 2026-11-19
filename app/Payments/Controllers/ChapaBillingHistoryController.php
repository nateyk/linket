<?php

declare(strict_types=1);

namespace App\Payments\Controllers;

use App\Payments\Models\PaymentTransaction;
use App\Storefront\Support\EtbMajorAmount;
use Common\Billing\Models\Price;
use Common\Billing\Models\Product;
use Common\Billing\Subscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use RuntimeException;

/**
 * Read-only Pro billing summary backed solely by Chapa payment transactions.
 * No bank reference submissions, manual verification or legacy provider state.
 */
final class ChapaBillingHistoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $plan = Product::query()->where('system_key', 'pro')->where('active', true)->first();
        $price = $plan
            ? Price::query()->where('product_id', $plan->id)
                ->where('currency', 'ETB')->where('interval', 'month')
                ->where('interval_count', 1)->orderByDesc('default')->first()
            : null;

        $subscriptionQuery = Subscription::query()
            ->where('user_id', $user->id)
            ->where('gateway_name', 'chapa')
            ->where('product_id', $plan?->id);
        $subscription = (clone $subscriptionQuery)->latest('id')->first();
        $ownedIds = (clone $subscriptionQuery)->pluck('id');

        $transactions = PaymentTransaction::query()
            ->where('gateway', 'chapa')
            ->where('payable_type', Subscription::class)
            ->whereIn('payable_id', $ownedIds)
            ->whereIn('purpose', ['subscription_initial', 'subscription_renewal'])
            ->latest('id')->limit(50)->get();

        $payments = $transactions->map(static function (PaymentTransaction $transaction): array {
            $cents = EtbMajorAmount::cents((string) $transaction->amount);
            if ($cents === null) {
                throw new RuntimeException('Invalid subscription payment amount in Chapa ledger.');
            }

            return [
                'payment_id' => $transaction->uuid,
                'amount_cents' => $cents,
                'currency' => $transaction->currency,
                'status' => match ($transaction->status) {
                    'paid' => 'paid',
                    'failed' => 'failed',
                    default => 'pending_payment',
                },
                'transaction_reference' => $transaction->tx_ref,
                'provider' => 'chapa',
                'paid_at' => $transaction->verified_at?->toIso8601String(),
                'created_at' => $transaction->created_at?->toIso8601String(),
                'receipt_url' => null,
            ];
        })->values();

        $pending = $payments->first(static fn (array $payment): bool => $payment['status'] === 'pending_payment');

        return response()->json([
            'subscription_gateway' => 'chapa',
            'pro_plan' => [
                'monthly_price_cents' => $price ? EtbMajorAmount::cents((string) $price->getRawOriginal('amount')) : null,
                'currency' => 'ETB',
                'product_id' => $plan?->id,
                'price_id' => $price?->id,
            ],
            'pro_subscription' => [
                'status' => $subscription?->gateway_status ?? 'inactive',
                'renews_at' => $subscription?->renews_at?->toIso8601String(),
                'ends_at' => $subscription?->ends_at?->toIso8601String(),
                'can_renew' => !$subscription || $subscription->ends_at !== null
                    || !($subscription->renews_at?->isFuture() ?? false),
                'payments' => $payments,
                'pending_payment' => $pending ? [
                    'payment_id' => $pending['payment_id'],
                    'status' => $pending['status'],
                    'amount_cents' => $pending['amount_cents'],
                ] : null,
            ],
        ])->header('Cache-Control', 'no-store, private');
    }
}
