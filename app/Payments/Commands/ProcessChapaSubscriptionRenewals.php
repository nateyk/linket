<?php

namespace App\Payments\Commands;

use App\Payments\Models\SubscriptionRenewalReminder;
use App\Payments\Notifications\ChapaRenewalReminder;
use App\Payments\Notifications\ChapaSubscriptionStatusNotification;
use Common\Billing\Subscription;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class ProcessChapaSubscriptionRenewals extends Command
{
    protected $signature = 'billing:process-chapa-renewals';

    protected $description = 'Send Chapa renewal reminders and expire subscriptions after the grace period.';

    public function handle(): int
    {
        $this->sendUpcomingReminders();

        $now = now();
        $graceCutoff = $now->copy()->subDays(7);
        $this->markPastDue($now, $graceCutoff);
        $this->expireAfterGrace($graceCutoff);

        return self::SUCCESS;
    }

    private function sendUpcomingReminders(): void
    {
        foreach ([7, 3, 1] as $daysBefore) {
            Subscription::query()
                ->with(['user', 'product'])
                ->where('gateway_name', 'chapa')
                ->whereNull('ends_at')
                ->whereDate('renews_at', now()->addDays($daysBefore)->toDateString())
                ->each(function (Subscription $subscription) use ($daysBefore): void {
                    $reminder = SubscriptionRenewalReminder::firstOrCreate([
                        'subscription_id' => $subscription->id,
                        'days_before' => $daysBefore,
                    ], ['sent_at' => now()]);

                    if ($reminder->wasRecentlyCreated) {
                        $subscription->user?->notify(new ChapaRenewalReminder($subscription, $daysBefore));
                    }
                });
        }
    }

    private function markPastDue(Carbon $now, Carbon $graceCutoff): void
    {
        Subscription::query()
            ->where('gateway_name', 'chapa')
            ->whereNull('ends_at')
            ->whereNotNull('renews_at')
            ->where('renews_at', '<', $now)
            ->where('renews_at', '>=', $graceCutoff)
            ->where(function ($query): void {
                $query->whereNull('gateway_status')->orWhere('gateway_status', '!=', 'past_due');
            })
            ->chunkById(100, function (Collection $subscriptions) use ($now, $graceCutoff): void {
                foreach ($subscriptions as $subscription) {
                    $changed = Subscription::query()
                        ->whereKey($subscription->id)
                        ->where('gateway_name', 'chapa')
                        ->whereNull('ends_at')
                        ->where('renews_at', '<', $now)
                        ->where('renews_at', '>=', $graceCutoff)
                        ->where(function ($query): void {
                            $query->whereNull('gateway_status')->orWhere('gateway_status', '!=', 'past_due');
                        })
                        ->update(['gateway_status' => 'past_due']);

                    if ($changed === 1) {
                        $subscription->user?->notify(new ChapaSubscriptionStatusNotification('past_due'));
                    }
                }
            });
    }

    private function expireAfterGrace(Carbon $graceCutoff): void
    {
        Subscription::query()
            ->where('gateway_name', 'chapa')
            ->whereNull('ends_at')
            ->whereNotNull('renews_at')
            ->where('renews_at', '<', $graceCutoff)
            ->chunkById(100, function (Collection $subscriptions) use ($graceCutoff): void {
                foreach ($subscriptions as $subscription) {
                    $changed = Subscription::query()
                        ->whereKey($subscription->id)
                        ->where('gateway_name', 'chapa')
                        ->whereNull('ends_at')
                        ->where('renews_at', '<', $graceCutoff)
                        ->update([
                            'gateway_status' => 'expired',
                            'ends_at' => now(),
                            'renews_at' => null,
                        ]);

                    if ($changed === 1) {
                        $subscription->user?->notify(new ChapaSubscriptionStatusNotification('expired'));
                    }
                }
            });
    }
}
