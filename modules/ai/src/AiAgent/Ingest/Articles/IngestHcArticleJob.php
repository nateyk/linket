<?php

namespace Ai\AiAgent\Ingest\Articles;

use Ai\AiAgent\Chunks\GenerateChunksForDocument;
use Ai\AiAgent\Ingest\Parsing\HtmlToMarkdown;
use App\HelpCenter\Models\HcArticle;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class IngestHcArticleJob implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(protected readonly HcArticle $article) {}

    public function handle(): void
    {
        if (
            $this->article->scan_pending &&
            strlen($this->article->body) > 100
        ) {
            $markdown = $this->prepareBody();
            (new GenerateChunksForDocument())->execute(
                $this->article,
                $markdown,
            );
        }

        $this->article->update([
            'scan_pending' => false,
            'scan_started_at' => null,
        ]);
    }

    public function uniqueId(): string
    {
        return $this->article->id;
    }

    protected function prepareBody()
    {
        $body = $this->article->body;
        $body = '<h1>' . $this->article->title . '</h1>' . $body;
        if ($this->article->description) {
            $body = '<p>' . $this->article->description . '</p>' . $body;
        }
        if ($sections = $this->article->load('sections.parent')->sections) {
            if ($sections->isNotEmpty()) {
                $listItems = $sections
                    ->map(
                        fn(
                            $section,
                        ) => "<li>{$section->parent->name} / {$section->name}</li>",
                    )
                    ->join('');
                $body = "<p>Categories</p><ul>{$listItems}</ul>" . $body;
            }
        }

        return (new HtmlToMarkdown())->execute($body);
    }
}
