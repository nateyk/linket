<?php

namespace App\Storefront\Services;

use App\Models\User;
use App\Payments\Models\DirectPaymentVerification;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Notifications\FreeQuotaMilestoneNotification;
use App\Telegram\Support\TelegramNotificationChannels;
use App\Telegram\Support\TelegramNotificationPreferences;
use Illuminate\Support\Facades\DB;

final class CreatorQuotaTelegramNotifier
{
    public function notifyFromVerifiedOrder(StorefrontOrder $order): void
    {
        if ($order->status !== 'paid'
            || $order->payment_gateway !== 'verify_et'
            || $order->monetization_policy !== CreatorVerificationAllowance::FREE_POLICY) {
            return;
        }

        $allowance = DB::table('creator_verification_allowances')
            ->where('storefront_order_id', $order->id)
            ->where('creator_id', $order->creator_id)
            ->where('status', 'consumed')
            ->exists();

        $verified = DirectPaymentVerification::query()
            ->where('payable_type', StorefrontOrder::class)
            ->where('payable_id', $order->id)
            ->where('status', 'success')
            ->whereNotNull('verified_at')
            ->whereNotNull('canonical_transaction_identity')
            ->exists();

        if (! $allowance || ! $verified) {
            return;
        }

        $creator = User::query()->find($order->creator_id);
        if (! $creator
            || ! TelegramNotificationChannels::isAvailableFor(
                $creator,
                TelegramNotificationPreferences::FREE_SALES_QUOTA,
            )) {
            return;
        }

        $counter = app(CreatorVerificationAllowance::class);
        if ($counter->isPro($creator)) {
            return;
        }

        $limit = $counter->limit();
        if ($limit <= 0) {
            return;
        }

        $consumed = $counter->usage($creator, $limit)['consumed'];
        if ($consumed < max(1, $limit - 2) || $consumed > $limit) {
            return;
        }

        $inserted = DB::table('telegram_free_quota_alerts')->insertOrIgnore([
            'creator_id' => $creator->id,
            'storefront_order_id' => $order->id,
            'free_limit' => $limit,
            'consumed' => $consumed,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        if ($inserted === 1) {
            $creator->notify(new FreeQuotaMilestoneNotification(
                $order->id,
                $consumed,
                $limit,
            ));
        }
    }
}
