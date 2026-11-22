<?php

namespace Tests\Feature;

use Illuminate\Console\Scheduling\Schedule;
use Tests\TestCase;

class DirectRenewalScheduleTest extends TestCase
{
    public function test_direct_renewals_are_scheduled_hourly_like_chapa(): void
    {
        $events = collect(app(Schedule::class)->events());

        $commands = $events
            ->map(fn ($event) => (string) ($event->command ?? $event->description ?? ''))
            ->implode("\n");

        $this->assertStringContainsString('billing:process-chapa-renewals', $commands);
        $this->assertStringContainsString('billing:process-direct-renewals', $commands);

        $direct = $events->first(
            fn ($event) => str_contains((string) ($event->command ?? ''), 'billing:process-direct-renewals'),
        );

        $this->assertNotNull($direct);
        $this->assertSame('0 * * * *', $direct->expression);
    }
}
