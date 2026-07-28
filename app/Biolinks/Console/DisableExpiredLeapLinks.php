<?php

namespace App\Biolinks\Console;

use App\Biolinks\Models\Biolink;
use Carbon\Carbon;
use Illuminate\Console\Command;

class DisableExpiredLeapLinks extends Command
{
    protected $signature = 'leapLinks:disable';

    public function handle(): int
    {
        Biolink::query()
            ->links()
            ->where('leap_until', '<', Carbon::now())
            ->update(['leap_until' => null]);

        $this->info('Disabled all expired leap links.');

        return 0;
    }
}
