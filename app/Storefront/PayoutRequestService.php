<?php

declare(strict_types=1);

namespace App\Storefront;

use App\Models\User;
use App\Storefront\ChapaPayoutService;
use App\Storefront\Ledger\CreatorLedgerService;
use App\Storefront\Ledger\Exceptions\InsufficientBalanceException;
use App\Storefront\Models\DigitalProductPayoutMethod;
use App\Storefront\Models\PayoutRequest;
use App\Storefront\Models\StorefrontPayoutIntent;
use App\Storefront\Services\StorefrontPayoutProcessingService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class PayoutRequestService
{
    public function create(int $creatorId, int $workspaceId, int $amountCents, ?int $payoutMethodId = null): PayoutRequest
    {
        if (settings('kyc.enabled', false)) {
            $creator = User::query()->find($creatorId);
            abort_unless($creator && $creator->isKycVerified(), 422, __('Complete identity verification before requesting a payout.'));
        }

        return DB::transaction(function () use ($creatorId, $workspaceId, $amountCents, $payoutMethodId): PayoutRequest {
            $accountQuery = DigitalProductPayoutMethod::query()
                ->with('withdrawalMethod')
                ->where('creator_id', $creatorId)
                ->where('is_active', true)
                ->where('status', DigitalProductPayoutMethod::STATUS_ACTIVE)
                ->whereNotNull('approved_at');

            $account = $payoutMethodId
                ? $accountQuery->where('id', $payoutMethodId)->lockForUpdate()->first()
                : $accountQuery->orderByDesc('is_default')->latest('id')->lockForUpdate()->first();

            $method = $account?->withdrawalMethod;
            if (!$account || !$method?->is_active) {
                throw ValidationException::withMessages(['withdrawal_method' => __('Choose an active withdrawal method before requesting a payout.')]);
            }

            // Chapa v1 transfers require at least 1.00 ETB, even if Finance
            // configures a lower provider minimum.
            $effectiveMinimumCents = max(100, (int) $method->minimum_amount_cents);
            if ($amountCents < $effectiveMinimumCents
                || ($method->maximum_amount_cents && $amountCents > $method->maximum_amount_cents)) {
                throw ValidationException::withMessages(['amount_cents' => __('This amount is outside the selected withdrawal method limits.')]);
            }

            if (PayoutRequest::query()->where('creator_id', $creatorId)->whereIn('status', ['requested', 'processing'])->lockForUpdate()->exists()) {
                throw ValidationException::withMessages(['amount_cents' => __('You already have a payout being reviewed.')]);
            }

            $available = app(DigitalProductFinance::class)->summary($creatorId, $workspaceId, true)['available_for_payout_cents'];
            if ($amountCents > $available) {
                throw ValidationException::withMessages(['amount_cents' => __('The requested payout exceeds your available balance.')]);
            }

            $payout = PayoutRequest::query()->create([
                'workspace_id' => $workspaceId,
                'creator_id' => $creatorId,
                'digital_product_payout_method_id' => $account->id,
                'withdrawal_method_id' => $method->id,
                'payout_method_label' => $account->display_label,
                'withdrawal_method_name' => $method->name,
                'payout_destination' => $account->destination,
                'account_holder_snapshot' => $account->account_holder,
                'bank_code_snapshot' => $account->bank_code,
                'currency' => config('storefront.currency', 'ETB'),
                'amount_cents' => $amountCents,
                'status' => 'requested',
            ]);

            app(DigitalProductFinance::class)->record($workspaceId, $creatorId, "payout-reserve:{$payout->id}", 'payout_reserved', -$amountCents, $payout->currency, [
                'payout_request_id' => $payout->id,
                'description' => __('Payout request reserved'),
            ]);

            try {
                app(CreatorLedgerService::class)->reserveForPayout($payout, $available);
            } catch (InsufficientBalanceException) {
                throw ValidationException::withMessages(['amount_cents' => __('The requested payout exceeds your verified available balance.')]);
            }

            $this->activity($payout, $creatorId, 'requested');
            Log::info('store.payout.requested', [
                'workspace_id' => $workspaceId,
                'creator_id' => $creatorId,
                'payout_id' => $payout->id,
                'amount_cents' => $amountCents,
                'currency' => $payout->currency,
            ]);

            return $payout;
        });
    }

    public function transition(PayoutRequest $payout, string $action, int $actorId, array $data = []): PayoutRequest
    {
        return DB::transaction(function () use ($payout, $action, $actorId, $data): PayoutRequest {
            $payout = PayoutRequest::query()->with(['withdrawalMethod', 'payoutMethod'])->lockForUpdate()->findOrFail($payout->id);
            $target = match ($action) {
                'start_processing' => 'processing',
                'mark_paid' => 'paid',
                'reject' => 'rejected',
                'cancel' => 'cancelled',
                default => throw ValidationException::withMessages(['action' => __('Unsupported payout action.')]),
            };

            if (!self::canTransition($payout->status, $target)) {
                throw ValidationException::withMessages(['status' => __('This payout can no longer be changed.')]);
            }

            if ($target === 'processing' && (!$payout->withdrawalMethod?->is_active
                || !$payout->payoutMethod?->is_active
                || $payout->payoutMethod->status !== DigitalProductPayoutMethod::STATUS_ACTIVE
                || !$payout->payoutMethod->approved_at)) {
                throw ValidationException::withMessages([
                    'payout_method' => __('Approve the receiving account and enable its provider before approving withdrawal.'),
                ]);
            }
            if ($target === 'processing' && !$this->isWithinCurrentMethodLimits($payout)) {
                throw ValidationException::withMessages([
                    'amount_cents' => __('The provider withdrawal limits changed. Review the request before approving it.'),
                ]);
            }

            // Automated transfers must only be marked paid by verified Chapa settlement.
            if ($target === 'paid' && ($payout->withdrawalMethod?->code !== 'other'
                || $payout->payoutIntents()->exists()
                || (bool) ($data['auto_transfer'] ?? false))) {
                throw ValidationException::withMessages([
                    'status' => __('Use Chapa settlement verification. A queued transfer is not a paid withdrawal.'),
                ]);
            }

            if (in_array($target, ['rejected', 'cancelled'], true) && $payout->payoutIntents()->exists()) {
                throw ValidationException::withMessages([
                    'status' => __('A transfer already exists. Verify its final status before releasing reserved funds.'),
                ]);
            }
            $transferReference = $data['transfer_reference'] ?? null;
            if ($target === 'paid' && blank($transferReference)) {
                throw ValidationException::withMessages(['transfer_reference' => __('Manual settlement reference is required.')]);
            }

            $updates = ['status' => $target];
            if ($target === 'processing') {
                $updates += ['processed_by' => $actorId, 'processing_at' => now(), 'admin_notes' => $data['note'] ?? null];
            }
            if ($target === 'paid') {
                $updates += ['processed_by' => $actorId, 'paid_at' => now(), 'transfer_reference' => $transferReference, 'admin_notes' => $data['note'] ?? $payout->admin_notes];
            }
            if ($target === 'rejected') {
                $updates += ['processed_by' => $actorId, 'rejected_at' => now(), 'rejection_reason' => $data['reason'] ?? __('Payout request rejected.')];
            }
            if ($target === 'cancelled') {
                $updates += ['cancelled_at' => now()];
            }

            $payout->update($updates);

            if (in_array($target, ['rejected', 'cancelled'], true)) {
                app(DigitalProductFinance::class)->record($payout->workspace_id, $payout->creator_id, "payout-release:{$payout->id}", 'payout_released', $payout->amount_cents, $payout->currency, [
                    'payout_request_id' => $payout->id,
                    'description' => __('Payout reservation released'),
                ]);

                app(CreatorLedgerService::class)->releasePayoutReservation($payout);
            }

            if ($target === 'paid') {
                app(CreatorLedgerService::class)->disbursePayout($payout);
            }

            $this->activity($payout, $actorId, $target, $data['reason'] ?? $data['note'] ?? null);
            Log::info('store.payout.transition', [
                'workspace_id' => $payout->workspace_id,
                'creator_id' => $payout->creator_id,
                'payout_id' => $payout->id,
                'action' => $action,
                'target' => $target,
                'actor_id' => $actorId,
            ]);

            return $payout->fresh(['creator', 'withdrawalMethod', 'activities.actor']);
        });
    }

    public function submitChapaPayout(PayoutRequest $payout, int $actorId): StorefrontPayoutIntent
    {
        if (!config('services.chapa.payouts_enabled', false)) {
            throw ValidationException::withMessages(['status' => __('Chapa v1 payout dispatch is disabled until test-mode acceptance.')]);
        }
        if ($payout->status !== 'processing') {
            throw ValidationException::withMessages(['status' => __('An administrator must approve the withdrawal before Chapa submission.')]);
        }

        $payout->load(['payoutMethod', 'withdrawalMethod']);
        if (!$payout->withdrawalMethod?->is_active
            || !$payout->payoutMethod?->is_active
            || $payout->payoutMethod->status !== DigitalProductPayoutMethod::STATUS_ACTIVE
            || !$payout->payoutMethod->approved_at
            || blank($payout->account_holder_snapshot)
            || blank($payout->bank_code_snapshot)) {
            throw ValidationException::withMessages(['payout_method' => __('The approved receiving account is unavailable or was modified.')]);
        }
        if (!$this->isWithinCurrentMethodLimits($payout)) {
            throw ValidationException::withMessages([
                'amount_cents' => __('The provider withdrawal limits changed. Review the request before transfer.'),
            ]);
        }

        if (!in_array($payout->withdrawalMethod->code, [
            'bank_transfer', ...ChapaPayoutService::WALLET_CODES,
        ], true)) {
            throw ValidationException::withMessages(['withdrawal_method' => __('The selected provider cannot be disbursed with Chapa v1.')]);
        }

        $existingIntent = $payout->payoutIntents()->first();
        if ($existingIntent && $existingIntent->status !== StorefrontPayoutIntent::STATUS_PREPARED) {
            throw ValidationException::withMessages(['status' => __('Transfer already initiated. Verify its existing reference; never resubmit it.')]);
        }

        // Ensure the current Chapa v1 directory accepts this bank/wallet BEFORE
        // allocating a durable payout reference and making an uncertain POST.
        $provider = app(ChapaPayoutService::class);
        $provider->resolveBank($payout->bank_code_snapshot);
        $provider->assertSufficientBalance((int) $payout->amount_cents);

        $processingService = app(StorefrontPayoutProcessingService::class);
        $intent = $existingIntent ?? $processingService->prepareIntent($payout, $payout->withdrawalMethod?->code ?? 'bank_transfer');
        $intent = $processingService->submitPayout($intent);

        $this->activity($payout, $actorId, 'chapa_transfer_submitted', "Chapa v1 reference: {$intent->merchant_reference}; status: {$intent->status}");

        return $intent;
    }

    private function isWithinCurrentMethodLimits(PayoutRequest $payout): bool
    {
        $method = $payout->withdrawalMethod;
        $minimum = max(100, (int) ($method?->minimum_amount_cents ?? 0));
        $maximum = (int) ($method?->maximum_amount_cents ?? 0);
        $amount = (int) $payout->amount_cents;

        return $amount >= $minimum && ($maximum === 0 || $amount <= $maximum);
    }

    public static function canTransition(string $from, string $to): bool
    {
        return in_array($to, match ($from) {
            'requested', 'pending' => ['processing', 'rejected', 'cancelled'],
            'processing' => ['paid', 'rejected'],
            default => [],
        }, true);
    }

    public function revealDestination(PayoutRequest $payout, int $adminId, ?string $reason): string
    {
        $payout->destinationReveals()->create(['revealed_by' => $adminId, 'reason' => $reason]);
        $this->activity($payout, $adminId, 'destination_revealed', $reason);
        Log::info('store.payout.destination_revealed', [
            'workspace_id' => $payout->workspace_id,
            'payout_id' => $payout->id,
            'actor_id' => $adminId,
        ]);

        return (string) $payout->payout_destination;
    }

    private function activity(PayoutRequest $payout, ?int $actorId, string $action, ?string $note = null): void
    {
        $payout->activities()->create(['actor_id' => $actorId, 'action' => $action, 'note' => $note]);
    }
}
