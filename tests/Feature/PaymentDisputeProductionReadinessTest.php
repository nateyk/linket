<?php

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;

it('has dispute lifecycle migration and required production scheduler hooks', function () {
    expect(Schema::hasColumn('storefront_payment_disputes', 'lifecycle_status'))->toBeTrue()
        ->and(Schema::hasTable('storefront_payment_dispute_events'))->toBeTrue();

    $commands = collect(app(Schedule::class)->events())
        ->map(fn ($event) => (string) ($event->command ?? $event->description ?? ''))
        ->implode("\n");

    expect($commands)->toContain('billing:reconcile-pending-verifications');

    $envExample = File::get(base_path('env.example'));
    expect($envExample)->not->toContain('VERIFY_ET_MOCK=true')
        ->and($envExample)->toContain('QUEUE_CONNECTION=');
});
