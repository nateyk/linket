<?php

namespace Common\Billing\Listeners;

use Common\Settings\Events\SettingsSaved;

class SyncPlansWhenBillingSettingsChange
{
    public function __invoke(SettingsSaved $event): void
    {
        // Chapa does not create remote subscription plans. Existing Stripe and
        // PayPal plans remain untouched so legacy subscriptions can finish.
    }
}
