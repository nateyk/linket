<?php

namespace App\Payments\VerifyEt;

use App\Models\User;
use App\Payments\Models\DirectPaymentVerification;
use App\Payments\Notifications\DirectProLifecycleNotification;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Services\CreatorPaymentReviewNotifier;
use App\Storefront\Services\CreatorQuotaTelegramNotifier;
use App\Telegram\Support\TelegramNotificationChannels;
use App\Telegram\Support\TelegramNotificationPreferences;
use Illuminate\Support\Facades\Log;

final class VerifyEtOutcomeNotifier
{
    /**
     * Dispatch creator Telegram alerts for storefront order outcomes.
     */
    public function notifyOrderOutcome(DirectPaymentVerification $verification, string $outcome): void
    {
        try {
            $order = StorefrontOrder::query()->find($verification->payable_id);
            if (!$order) {
                return;
            }

            if ($outcome === 'success' && $order->status === 'paid') {
                app(CreatorQuotaTelegramNotifier::class)->notifyFromVerifiedOrder($order);
            } elseif ($outcome === 'manual_review' && $order->status === 'manual_review') {
                app(CreatorPaymentReviewNotifier::class)->notify($order, $verification->id);
            }
        } catch (\Throwable) {
            Log::warning('telegram.order_alert_enqueue_failed', [
                'verification_id' => $verification->id,
            ]);
        }
    }

    /**
     * Dispatch Telegram notifications for pro subscription lifecycle events.
     *
     * @param array{creator_id: int, subscription_id: int, payment_id: int, event: string} $lifecycle
     */
    public function notifyProLifecycle(array $lifecycle): void
    {
        try {
            $creator = User::query()->find($lifecycle['creator_id']);
            if ($creator && TelegramNotificationChannels::isAvailableFor(
                $creator,
                TelegramNotificationPreferences::PRO_BILLING,
            )) {
                $creator->notify(new DirectProLifecycleNotification(
                    $lifecycle['subscription_id'],
                    $lifecycle['event'],
                    $lifecycle['payment_id'],
                ));
            }
        } catch (\Throwable) {
            Log::warning('telegram.pro_lifecycle_alert_enqueue_failed', [
                'subscription_id' => $lifecycle['subscription_id'],
            ]);
        }
    }
}
