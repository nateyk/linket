<?php

namespace App\Payments\Commands;

use App\Payments\Models\DirectPaymentVerification;
use App\Payments\Models\VerifyEtWebhookDelivery;
use App\Payments\VerifyEt\VerifyEtGateway;
use App\Jobs\ProcessVerifyEtWebhook;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Services\CreatorPaymentReviewNotifier;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

final class ReconcilePendingVerifications extends Command
{
    protected $signature = 'billing:reconcile-pending-verifications';
    protected $description = 'Reconcile delayed direct-payment verifications and expire unpaid orders.';

    public function handle(): int
    {
        VerifyEtWebhookDelivery::query()
            ->whereIn('status', ['received', 'unmatched'])
            ->whereNotNull('provider_request_id')
            ->whereNotNull('payload')
            ->where('received_at', '<', now()->subMinute())
            ->where('received_at', '>', now()->subDay())
            ->orderBy('id')
            ->chunkById(100, function ($deliveries): void {
                foreach ($deliveries as $delivery) {
                    ProcessVerifyEtWebhook::dispatch($delivery->id)->afterCommit();
                }
            });

        app(\App\Storefront\Services\CreatorVerificationAllowance::class)->expireAbandoned();

        StorefrontOrder::query()
            ->where('payment_gateway', 'verify_et')
            ->where('status', 'pending_payment')
            ->where('payment_expires_at', '<', now())
            ->update(['status' => 'expired']);

        DirectPaymentVerification::query()
            ->whereIn('status', ['pending', 'verifying'])
            ->where('created_at', '<', now()->subMinutes(5))
            ->orderBy('id')
            ->chunkById(100, function ($verifications): void {
                foreach ($verifications as $verification) {
                    if ($verification->created_at->lt(now()->subDay())) {
                        $changed = DirectPaymentVerification::query()->whereKey($verification->id)->whereIn('status', ['pending', 'verifying'])->update(['status' => 'manual_review']);
                        if (!$changed) {
                            continue;
                        }
                        if ($verification->payable_type === StorefrontOrder::class) {
                            $updated = StorefrontOrder::query()->whereKey($verification->payable_id)->whereIn('status', ['pending_payment', 'verifying'])->update(['status' => 'manual_review']);
                            $creatorEmail = $updated ? $verification->payable?->creator?->email : null;
                            if ($creatorEmail) {
                                Mail::raw('A buyer payment needs your review in Linket.', fn ($message) => $message->to($creatorEmail)->subject('Payment needs review'));
                            }
                            if ($updated) {
                                $order = StorefrontOrder::query()->find($verification->payable_id);
                                if ($order) {
                                    app(CreatorPaymentReviewNotifier::class)->notify($order, $verification->id);
                                }
                            }
                        }
                        continue;
                    }

                    $status = $verification->provider_request_id
                        ? app(VerifyEtGateway::class)->reconcile($verification)
                        : app(VerifyEtGateway::class)->submit($verification);
                    if ($status === 'mismatch' && $verification->payable_type === StorefrontOrder::class) {
                        StorefrontOrder::query()->whereKey($verification->payable_id)->whereIn('status', ['pending_payment', 'verifying'])->update(['status' => 'failed_verification']);
                    } elseif ($status === 'manual_review' && $verification->payable_type === StorefrontOrder::class) {
                        StorefrontOrder::query()->whereKey($verification->payable_id)->whereIn('status', ['pending_payment', 'verifying'])->update(['status' => 'manual_review']);
                        $order = StorefrontOrder::query()->find($verification->payable_id);
                        if ($order) {
                            app(CreatorPaymentReviewNotifier::class)->notify($order, $verification->id);
                        }
                    }
                }
            });

        return self::SUCCESS;
    }
}
