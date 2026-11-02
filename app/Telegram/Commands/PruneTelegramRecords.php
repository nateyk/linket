<?php

namespace App\Telegram\Commands;

use App\Telegram\Models\TelegramLinkToken;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

final class PruneTelegramRecords extends Command
{
    protected $signature = 'telegram:prune-records';

    protected $description = 'Prune old Telegram link tokens and webhook deduplication records.';

    public function handle(): int
    {
        $cutoff = now()->subDays(30);

        TelegramLinkToken::query()
            ->where(function ($query) use ($cutoff): void {
                $query->where('expires_at', '<', $cutoff)
                    ->orWhere('consumed_at', '<', $cutoff);
            })
            ->delete();

        DB::table('telegram_webhook_updates')
            ->where('processed_at', '<', $cutoff)
            ->delete();

        return self::SUCCESS;
    }
}
