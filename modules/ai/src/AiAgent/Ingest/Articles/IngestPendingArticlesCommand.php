<?php

namespace Ai\AiAgent\Ingest\Articles;

use Illuminate\Console\Command;

class IngestPendingArticlesCommand extends Command
{
    protected $signature = 'ingest:articles';

    public function handle(): void
    {
        (new IngestArticles())->execute();
    }
}
