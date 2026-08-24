<?php

namespace App\Console\Commands;

use App\Stores\Models\Store;
use Illuminate\Console\Command;

class StoresReindexCommand extends Command
{
    protected $signature = 'stores:reindex {--chunk=500 : Batch size for Scout reindex}';

    protected $description = 'Reindex stores for Scout (Phase 3) in batches of 500';

    public function handle(): int
    {
        $chunk = max(1, (int) $this->option('chunk'));

        $this->info("Reindexing stores in batches of {$chunk}...");

        $query = Store::query();

        // Prefer Scout's makeAllSearchable batching if available, fallback to chunk
        try {
            // makeAllSearchable uses chunk 500 internally when called without args, but we force our chunk
            $query->chunkById($chunk, function ($stores) {
                $stores->searchable();
            });
            $this->info('Stores reindexed.');
        } catch (\Throwable $e) {
            $this->error('Reindex failed: ' . $e->getMessage());
            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
