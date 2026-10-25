<?php

namespace Ai\AiAgent\Ingest\Snippets;

use Illuminate\Console\Command;

class IngestPendingSnippetsCommand extends Command
{
    protected $signature = 'ingest:snippets';

    public function handle(): void
    {
        (new IngestSnippets())->execute();
    }
}
