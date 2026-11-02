<?php

namespace App\Payments\Commands;

use App\Payments\Models\SubscriptionRenewalReminder;
use App\Payments\Notifications\DirectRenewalReminder;
use App\Payments\Notifications\DirectProLifecycleNotification;
use App\Models\User;
use App\Telegram\Support\TelegramNotificationChannels;
use App\Telegram\Support\TelegramNotificationPreferences;
use Illuminate\Support\Facades\Log;
use Common\Billing\Subscription;
use Illuminate\Console\Command;

final class ProcessDirectSubscriptionRenewals extends Command
{
    protected $signature = 'billing:process-direct-renewals';

    protected $description = 'Remind creators and expire unpaid direct-transfer Pro subscriptions.';

    public function handle(): int
    {
        foreach ([7, 3, 1] as $daysBefore) {
            Subscription::query()
                ->with(['user', 'product'])
                ->where('gateway_name', 'verify_et')
                ->whereNull('ends_at')
                ->whereDate('renews_at', now()->addDays($daysBefore)->toDateString())
                ->each(function (Subscription $subscription) use ($daysBefore): void {
                    $reminder = SubscriptionRenewalReminder::firstOrCreate([
                        'subscription_id' => $subscription->id,
                        'days_before' => $daysBefore,
                    ], ['sent_at' => now()]);

                    if ($reminder->wasRecentlyCreated) {
                        $subscription->user?->notify(new DirectRenewalReminder($subscription, $daysBefore));
                    }
                });
        }

        $now = now();
        $graceCutoff = $now->copy()->subDays(7);

        Subscription::query()
            ->where('gateway_name', 'verify_et')
            ->whereNull('ends_at')
            ->whereNotNull('renews_at')
            ->where('renews_at', '<', $now)
            ->where('renews_at', '>=', $graceCutoff)
            ->where(function ($query): void {
                $query->where('gateway_status', '!=', 'past_due')
                    ->orWhereNull('gateway_status');
            })
            ->chunkById(100, function ($subscriptions) use ($now, $graceCutoff): void {
                foreach ($subscriptions as $subscription) {
                    $changed = Subscription::query()
                        ->whereKey($subscription->id)
                        ->where('gateway_name', 'verify_et')
                        ->whereNull('ends_at')
                        ->where('renews_at', '<', $now)
                        ->where('renews_at', '>=', $graceCutoff)
                        ->where(function ($query): void {
                            $query->where('gateway_status', '!=', 'past_due')
                                ->orWhereNull('gateway_status');
                        })
                        ->update(['gateway_status' => 'past_due']);

                    if ($changed === 1) {
                        $this->notifyStatus($subscription, 'past_due');
                    }
                }
            });

        Subscription::query()
            ->where('gateway_name', 'verify_et')
            ->whereNull('ends_at')
            ->whereNotNull('renews_at')
            ->where('renews_at', '<', $graceCutoff)
            ->chunkById(100, function ($subscriptions) use ($graceCutoff): void {
                foreach ($subscriptions as $subscription) {
                    $changed = Subscription::query()
                        ->whereKey($subscription->id)
                        ->where('gateway_name', 'verify_et')
                        ->whereNull('ends_at')
                        ->where('renews_at', '<', $graceCutoff)
                        ->update([
                            'gateway_status' => 'expired',
                            'ends_at' => now(),
                            'renews_at' => null,
                        ]);

                    if ($changed === 1) {
                        $this->notifyStatus($subscription, 'expired');
                    }
                }
            });

        return self::SUCCESS;
    }

    private function notifyStatus(Subscription $subscription, string $event): void
    {
        try {
            $creator = User::query()->find($subscription->user_id);
            if ($creator && TelegramNotificationChannels::isAvailableFor(
                $creator, TelegramNotificationPreferences::PRO_BILLING,
            )) {
                $creator->notify(new DirectProLifecycleNotification(
                    $subscription->id,
                    $event,
                ));
            }
        } catch (\Throwable) {
            // Billing state transitions must not depend on Telegram availability.
            Log::warning('telegram.pro_lifecycle_alert_enqueue_failed', [
                'subscription_id' => $subscription->id,
                'event' => $event,
            ]);
        }
    }
}
