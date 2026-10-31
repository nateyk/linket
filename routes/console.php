<?php

use App\Webhooks\Console\DeleteOldWebhookDeliveries;
use App\Biolinks\Console\DisableExpiredLeapLinks;
use App\Links\Console\ArchiveExpiredLinkeables;
use App\Demo\Console\ResetDemoSite;
use Illuminate\Support\Facades\Schedule;
use App\Payments\Commands\ReconcilePendingVerifications;
use App\Payments\Commands\ProcessDirectSubscriptionRenewals;
use App\Storefront\Commands\GenerateCommissionInvoices;
use App\Storefront\Commands\EnforceCommissionRestrictions;

Schedule::command(ArchiveExpiredLinkeables::class)
->everyFifteenMinutes();

Schedule::command(DisableExpiredLeapLinks::class)
->everyFifteenMinutes();

Schedule::command(DeleteOldWebhookDeliveries::class)->dailyAt('03:30');

if (config('app.demo')) {
  Schedule::command(ResetDemoSite::class)->daily();
}

if (config('queue.default') !== 'sync') {
  Schedule::command('horizon:snapshot')->everyFiveMinutes();
}

Schedule::command(ReconcilePendingVerifications::class)->everyTenMinutes()->withoutOverlapping()->onOneServer();
Schedule::command(GenerateCommissionInvoices::class)->monthlyOn(1, '00:01')->timezone('Africa/Nairobi')->withoutOverlapping()->onOneServer();
Schedule::command(EnforceCommissionRestrictions::class)->hourly()->withoutOverlapping()->onOneServer();
Schedule::command(ProcessDirectSubscriptionRenewals::class)->dailyAt('09:00')->timezone('Africa/Nairobi')->withoutOverlapping()->onOneServer();

