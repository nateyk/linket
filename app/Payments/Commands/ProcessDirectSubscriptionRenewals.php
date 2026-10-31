<?php

namespace App\Payments\Commands;

use App\Payments\Models\SubscriptionRenewalReminder;
use App\Payments\Notifications\DirectRenewalReminder;
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

        Subscription::query()
            ->where('gateway_name', 'verify_et')
            ->whereNull('ends_at')
            ->whereNotNull('renews_at')
            ->where('renews_at', '<', now())
            ->where('renews_at', '>=', now()->subDays(7))
            ->update(['gateway_status' => 'past_due']);

        Subscription::query()
            ->where('gateway_name', 'verify_et')
            ->whereNull('ends_at')
            ->whereNotNull('renews_at')
            ->where('renews_at', '<', now()->subDays(7))
            ->update([
                'gateway_status' => 'expired',
                'ends_at' => now(),
                'renews_at' => null,
            ]);

        return self::SUCCESS;
    }
}
