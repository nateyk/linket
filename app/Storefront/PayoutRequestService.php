<?php

namespace App\Storefront;

use App\Models\User;
use App\Storefront\Models\DigitalProductPayoutMethod;
use App\Storefront\Models\PayoutRequest;
use App\Storefront\Models\DigitalProductWithdrawalMethod;
use App\Storefront\ChapaPayoutService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PayoutRequestService
{
    public function create(int $creatorId, int $workspaceId, int $amountCents): PayoutRequest
    {
        if (settings('kyc.enabled', false)) {
            $creator = User::query()->find($creatorId);
            abort_unless($creator && $creator->isKycVerified(), 422, __('Complete identity verification before requesting a payout.'));
        }

        return DB::transaction(function () use ($creatorId, $workspaceId, $amountCents): PayoutRequest {
            $account = DigitalProductPayoutMethod::query()
                ->with('withdrawalMethod')
                ->where('workspace_id', $workspaceId)
                ->where('creator_id', $creatorId)
                ->lockForUpdate()
                ->first();
            $method = $account?->withdrawalMethod;
            if (!$account || !$method?->is_active) {
                throw ValidationException::withMessages(['withdrawal_method' => __('Choose an active withdrawal method before requesting a payout.')]);
            }
            if ($amountCents < $method->minimum_amount_cents || ($method->maximum_amount_cents && $amountCents > $method->maximum_amount_cents)) {
                throw ValidationException::withMessages(['amount_cents' => __('This amount is outside the selected withdrawal method limits.')]);
            }
            if (PayoutRequest::query()->where('workspace_id', $workspaceId)->where('creator_id', $creatorId)->whereIn('status', ['requested', 'processing'])->lockForUpdate()->exists()) {
                throw ValidationException::withMessages(['amount_cents' => __('You already have a payout being reviewed.')]);
            }

            $available = app(DigitalProductFinance::class)->summary($creatorId, $workspaceId, true)['available_for_payout_cents'];
            if ($amountCents > $available) {
                throw ValidationException::withMessages(['amount_cents' => __('The requested payout exceeds your available balance.')]);
            }

            $payout = PayoutRequest::create([
                'workspace_id' => $workspaceId,
                'creator_id' => $creatorId,
                'digital_product_payout_method_id' => $account->id,
                'withdrawal_method_id' => $method->id,
                'payout_method_label' => $account->display_label,
                'withdrawal_method_name' => $method->name,
                'payout_destination' => $account->destination,
                'currency' => config('storefront.currency'),
                'amount_cents' => $amountCents,
                'status' => 'requested',
            ]);

            app(DigitalProductFinance::class)->record($workspaceId, $creatorId, "payout-reserve:{$payout->id}", 'payout_reserved', -$amountCents, $payout->currency, [
                'payout_request_id' => $payout->id,
                'description' => __('Payout request reserved'),
            ]);
            $this->activity($payout, $creatorId, 'requested');

            return $payout;
        });
    }

    public function transition(PayoutRequest $payout, string $action, int $actorId, array $data = []): PayoutRequest
    {
        return DB::transaction(function () use ($payout, $action, $actorId, $data): PayoutRequest {
            $payout = PayoutRequest::query()->with('withdrawalMethod')->lockForUpdate()->findOrFail($payout->id);
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

            $transferReference = $data['transfer_reference'] ?? null;
            $autoTransfer = (bool) ($data['auto_transfer'] ?? false);

            if ($target === 'paid') {
                if ($autoTransfer && in_array($payout->withdrawalMethod?->code, ['bank_transfer', 'telebirr'], true)) {
                    $transferReference = app(ChapaPayoutService::class)->createTransfer($payout);
                } elseif ($autoTransfer) {
                    // Auto transfer requested but method not supported for Chapa API;
                    // generate a manual reference as fallback.
                    $transferReference = 'MANUAL-' . strtoupper(substr(md5($payout->id . time()), 0, 12));
                } elseif (blank($transferReference)) {
                    throw ValidationException::withMessages(['transfer_reference' => __('A transfer reference is required before marking a payout paid.')]);
                }
            }

            $updates = ['status' => $target];
            if ($target === 'processing') $updates += ['processed_by' => $actorId, 'processing_at' => now(), 'admin_notes' => $data['note'] ?? null];
            if ($target === 'paid') $updates += ['processed_by' => $actorId, 'paid_at' => now(), 'transfer_reference' => $transferReference, 'admin_notes' => $data['note'] ?? $payout->admin_notes];
            if ($target === 'rejected') $updates += ['processed_by' => $actorId, 'rejected_at' => now(), 'rejection_reason' => $data['reason'] ?? __('Payout request rejected.')];
            if ($target === 'cancelled') $updates += ['cancelled_at' => now()];
            $payout->update($updates);

            if (in_array($target, ['rejected', 'cancelled'], true)) {
                app(DigitalProductFinance::class)->record($payout->workspace_id, $payout->creator_id, "payout-release:{$payout->id}", 'payout_released', $payout->amount_cents, $payout->currency, [
                    'payout_request_id' => $payout->id,
                    'description' => __('Payout reservation released'),
                ]);
            }
            $this->activity($payout, $actorId, $target, $data['reason'] ?? $data['note'] ?? null);

            return $payout->fresh(['creator', 'withdrawalMethod', 'activities.actor']);
        });
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

        return $payout->payout_destination;
    }

    private function activity(PayoutRequest $payout, ?int $actorId, string $action, ?string $note = null): void
    {
        $payout->activities()->create(['actor_id' => $actorId, 'action' => $action, 'note' => $note]);
    }
}
