<?php

use App\Webhooks\Console\DeleteOldWebhookDeliveries;
use App\Biolinks\Console\DisableExpiredLeapLinks;
use App\Links\Console\ArchiveExpiredLinkeables;
use App\Demo\Console\ResetDemoSite;
use Illuminate\Support\Facades\Schedule;

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

