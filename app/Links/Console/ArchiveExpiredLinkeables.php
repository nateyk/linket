<?php

namespace App\Links\Console;

use App\Biolinks\Models\Biolink;
use App\Links\Models\Link;
use App\Folders\Models\Folder;
use App\QrCodes\Models\QrCode;
use Carbon\Carbon;
use Illuminate\Console\Command;

class ArchiveExpiredLinkeables extends Command
{
    protected $signature = 'linkeables:archive_expired';

    public function handle()
    {
        Link::query()
            ->where('expires_at', '<', Carbon::now())
            ->update(['deleted_at' => now()]);

        Folder::query()
            ->where('expires_at', '<', Carbon::now())
            ->update(['deleted_at' => now()]);

        Biolink::query()
            ->where('expires_at', '<', Carbon::now())
            ->update(['deleted_at' => now()]);

        QrCode::query()
            ->where('expires_at', '<', Carbon::now())
            ->update(['deleted_at' => now()]);

        $this->info('Archived all expired linkeables.');
    }
}
