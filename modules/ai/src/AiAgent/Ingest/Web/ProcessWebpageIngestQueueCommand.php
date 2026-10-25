<?php

namespace Ai\AiAgent\Ingest\Web;

use Illuminate\Console\Command;

class ProcessWebpageIngestQueueCommand extends Command
{
    protected $signature = 'ingest:webpages';

    public function handle(): void
    {
        (new WebsiteIngester())->processWebpageIngestQueue();
    }
}
