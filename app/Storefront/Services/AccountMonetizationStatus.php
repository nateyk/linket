<?php

namespace App\Storefront\Services;

use App\Models\User;
use App\Storefront\Models\CommissionInvoice;

final class AccountMonetizationStatus
{
    public function isRestricted(User $creator): bool
    {
        return false;
    }

    public function canSell(User $creator): bool
    {
        return true;
    }

    public function hasOutstandingLegacyInvoice(User $creator): bool
    {
        return CommissionInvoice::query()
            ->where('creator_id', $creator->id)
            ->whereIn('status', ['pending', 'overdue'])
            ->where('due_at', '<', now())
            ->whereDoesntHave('directPaymentVerifications', fn ($query) => $query
                ->whereIn('status', ['pending', 'verifying', 'manual_review'])
                ->whereColumn('direct_payment_verifications.created_at', '<=', 'commission_invoices.due_at'))
            ->exists();
    }
}
