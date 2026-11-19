<?php

declare(strict_types=1);

namespace App\Storefront\Controllers;

use App\Storefront\Ledger\AccountCodes;
use App\Storefront\Models\StorefrontJournalLine;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Models\StorefrontPaymentAttempt;
use App\Storefront\Models\StorefrontPayoutIntent;
use App\Storefront\Services\MarketplacePayoutPolicy;
use Common\Settings\Models\Setting;
use App\Storefront\Services\MarketplaceReconciliationService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;

class AdminMarketplaceFinanceController extends Controller
{
    public function summary(Request $request): array
    {
        Gate::authorize('admin.access');

        $reconciliationService = app(MarketplaceReconciliationService::class);
        $audit = $reconciliationService->auditLedgerIntegrity();

        $staleAttemptCutoff = Carbon::now()->subMinutes(15);
        $stalePayoutCutoff = Carbon::now()->subMinutes(5);
        $holdDays = app(MarketplacePayoutPolicy::class)->holdDays();
        $escrowCutoff = Carbon::now()->subDays($holdDays);

        $stalePaymentsCount = StorefrontPaymentAttempt::query()
            ->where('status', StorefrontPaymentAttempt::STATUS_PENDING)
            ->where('created_at', '<=', $staleAttemptCutoff)
            ->count();

        $stalePayoutsCount = StorefrontPayoutIntent::query()
            ->whereIn('status', [StorefrontPayoutIntent::STATUS_SUBMITTED, StorefrontPayoutIntent::STATUS_PROVIDER_PENDING])
            ->where('created_at', '<=', $stalePayoutCutoff)
            ->count();

        $maturedEscrowOrdersCount = StorefrontOrder::query()
            ->where('status', 'paid')
            ->where('monetization_policy', 'marketplace_v2')
            ->where('paid_at', '<=', $escrowCutoff)
            ->whereDoesntHave('journalEntries', fn ($q) => $q->where('event_type', 'funds_available'))
            ->count();

        $deficitCreatorsCount = StorefrontJournalLine::query()
            ->where('account_code', AccountCodes::CREATOR_DEFICIT_RECEIVABLE)
            ->distinct('creator_id')
            ->count('creator_id');

        return [
            'data' => [
                'ledger_audit' => [
                    'is_balanced' => $audit->isBalanced,
                    'total_debits_cents' => $audit->totalDebitsCents,
                    'total_credits_cents' => $audit->totalCreditsCents,
                    'clearing_balance_cents' => $audit->clearingBalanceCents,
                    'total_creator_liabilities_cents' => $audit->totalCreatorLiabilitiesCents,
                    'platform_commission_cents' => $audit->platformCommissionCents,
                    'total_disbursed_cents' => $audit->totalDisbursedCents,
                    'negative_balances_count' => count($audit->negativeBalancesFound),
                    'issues_count' => count($audit->issues),
                ],
                'pending_action_counts' => [
                    'stale_payment_attempts' => $stalePaymentsCount,
                    'stale_payout_intents' => $stalePayoutsCount,
                    'matured_escrow_orders' => $maturedEscrowOrdersCount,
                    'deficit_creators' => $deficitCreatorsCount,
                ],
            ],
        ];
    }

    public function payoutPolicy(): array
    {
        Gate::authorize('admin.access');
        Gate::authorize('update', Setting::class);

        return ['data' => app(MarketplacePayoutPolicy::class)->toArray()];
    }

    public function updatePayoutPolicy(Request $request): array
    {
        Gate::authorize('admin.access');
        Gate::authorize('update', Setting::class);

        $data = $request->validate([
            'payout_hold_days' => ['required', 'integer', 'min:0', 'max:30'],
            'minimum_payout_cents' => ['required', 'integer', 'min:100', 'max:100000000'],
        ]);

        settings()->save([
            MarketplacePayoutPolicy::HOLD_DAYS_KEY => (int) $data['payout_hold_days'],
            MarketplacePayoutPolicy::MINIMUM_CENTS_KEY => (int) $data['minimum_payout_cents'],
        ]);

        Log::info('admin.marketplace.payout_policy_updated', [
            'admin_id' => $request->user()->id,
            'payout_hold_days' => $data['payout_hold_days'],
            'minimum_payout_cents' => $data['minimum_payout_cents'],
        ]);

        return $this->payoutPolicy();
    }

    public function reconcile(Request $request): array
    {
        Gate::authorize('admin.access');

        $dryRun = (bool) $request->boolean('dry_run');
        $reconciliationService = app(MarketplaceReconciliationService::class);
        $report = $reconciliationService->reconcile($dryRun);

        Log::info('admin.marketplace.reconciled', [
            'admin_id' => $request->user()->id,
            'dry_run' => $dryRun,
            'matured_orders_count' => $report->maturedOrdersCount,
            'reconciled_payments_count' => $report->reconciledPaymentsCount,
            'reconciled_payouts_count' => $report->reconciledPayoutsCount,
        ]);

        return [
            'data' => [
                'dry_run' => $dryRun,
                'executed_at' => $report->executedAt,
                'matured_orders_count' => $report->maturedOrdersCount,
                'reconciled_payments_count' => $report->reconciledPaymentsCount,
                'reconciled_payouts_count' => $report->reconciledPayoutsCount,
                'missing_journal_entries_fixed_count' => $report->missingJournalEntriesFixedCount,
                'is_healthy' => $report->isHealthy(),
                'ledger_audit' => [
                    'is_balanced' => $report->ledgerAudit?->isBalanced,
                    'total_debits_cents' => $report->ledgerAudit?->totalDebitsCents,
                    'total_credits_cents' => $report->ledgerAudit?->totalCreditsCents,
                    'clearing_balance_cents' => $report->ledgerAudit?->clearingBalanceCents,
                ],
            ],
        ];
    }
}
