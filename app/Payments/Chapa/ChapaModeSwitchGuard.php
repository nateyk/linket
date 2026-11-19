<?php

declare(strict_types=1);

namespace App\Payments\Chapa;

use App\Payments\Models\PaymentTransaction;
use App\Payments\Models\ProSubscriptionPayment;
use App\Storefront\Models\PayoutRequest;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Models\StorefrontPaymentAttempt;
use App\Storefront\Models\StorefrontPayoutIntent;
use Illuminate\Validation\ValidationException;

final class ChapaModeSwitchGuard
{
    /** @return array<string, int> */
    public function counts(): array
    {
        return [
            'storefront_attempts' => StorefrontPaymentAttempt::query()
                ->whereIn('status', ['created', 'initializing', 'pending'])->count(),
            'storefront_orders' => StorefrontOrder::query()
                ->where('collection_owner', 'platform_chapa')
                ->whereIn('status', ['pending_payment', 'verifying', 'manual_review'])->count(),
            'subscription_payments' => ProSubscriptionPayment::query()
                ->whereIn('status', ['pending_payment', 'processing', 'verifying'])->count(),
            'chapa_transactions' => PaymentTransaction::query()
                ->where('gateway', 'chapa')->whereIn('status', ['pending', 'processing'])->count(),
            'creator_withdrawals' => PayoutRequest::query()
                ->whereIn('status', ['requested', 'processing', 'provider_pending', 'requires_action'])->count(),
            'provider_payouts' => StorefrontPayoutIntent::query()
                ->whereIn('status', ['prepared', 'submitted', 'provider_pending', 'requires_action'])->count(),
        ];
    }

    public function assertNoInFlight(): void
    {
        if (array_sum($this->counts()) > 0) {
            throw ValidationException::withMessages([
                'mode' => __('Resolve pending payments and withdrawals before changing Chapa credentials or mode.'),
            ]);
        }
    }
}
