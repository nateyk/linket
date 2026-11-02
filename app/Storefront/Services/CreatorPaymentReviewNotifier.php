<?php

namespace App\Storefront\Services;

use App\Models\User;
use App\Payments\Models\DirectPaymentVerification;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Notifications\PaymentReviewNeededNotification;
use App\Telegram\Support\TelegramNotificationChannels;
use App\Telegram\Support\TelegramNotificationPreferences;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

final class CreatorPaymentReviewNotifier
{
    public function notify(StorefrontOrder $order, int $verificationId): void
    {
        if ($order->status !== 'manual_review'
            || $order->payment_gateway !== 'verify_et') {
            return;
        }

        try {
            $review = DirectPaymentVerification::query()
                ->whereKey($verificationId)
                ->where('payable_type', StorefrontOrder::class)
                ->where('payable_id', $order->id)
                ->where('status', 'manual_review')
                ->exists();

            if (! $review) {
                return;
            }

            $creator = User::query()->find($order->creator_id);
            if (! $creator || ! TelegramNotificationChannels::isAvailableFor(
                $creator, TelegramNotificationPreferences::PAYMENT_REVIEW,
            )) {
                return;
            }

            $inserted = DB::table('telegram_payment_reviews')->insertOrIgnore([
                'creator_id' => $creator->id,
                'storefront_order_id' => $order->id,
                'verification_id' => $verificationId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            if ($inserted === 1) {
                $creator->notify(new PaymentReviewNeededNotification(
                    $order->id, $verificationId,
                ));
            }
        } catch (\Throwable) {
            // A notification error must never affect verified payment state.
            Log::warning('telegram.payment_review_alert_enqueue_failed', [
                'order_id' => $order->id,
            ]);
        }
    }
}
