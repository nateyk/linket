<?php

namespace Ai\AiAgent\Ingest\Web;

use Ai\AiAgent\Chunks\GenerateChunksForDocument;
use Ai\AiAgent\Models\AiAgentWebpage;
use Ai\AiAgent\Models\AiAgentWebsite;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class WebsiteIngester
{
    protected int $pagesToProcessPerRun = 20;

    public function __construct()
    {
        @set_time_limit(0);
    }

    public function syncExistingWebpage(AiAgentWebpage $webpage): void
    {
        if ($webpage->website->syncIsInProgress()) {
            throw ValidationException::withMessages([
                'url' => 'Website is already being ingested.',
            ]);
        }

        $this->processWebpage(
            $webpage->website,
            $webpage->url,
            extractUrls: false,
        );
    }

    public function startWebsiteIngest(
        string $url,
        string $scanType = 'single',
        array $scrapeConfig = [],
    ): void {
        $urlHash = AiAgentWebsite::hashUrl($url);
        $document = (new WebsiteScraper())->scrape($url);

        if (!$document) {
            throw ValidationException::withMessages([
                'url' => __(
                    'Could not ingest this url, make sure URL is valid',
                ),
            ]);
        }

        $website = AiAgentWebsite::where('url_hash', $urlHash)->first();

        if ($website?->syncIsInProgress()) {
            throw ValidationException::withMessages([
                'url' => 'Website is already being ingested.',
            ]);
        }

        // create or update website
        $data = [
            'url' => $url,
            'title' => $document['title'],
            'language' => $document['language'],
            'scan_type' => $scanType,
            'scan_pending' => true,
            'scan_version' => $website ? $website->scan_version + 1 : 1,
            'scrape_config' => $scrapeConfig,
        ];
        if ($website) {
            $website->update($data);
        } else {
            $website = AiAgentWebsite::create($data);
        }

        $shouldExtractUrls = !$website->isSinglePage();
        $extractNestedUrlsOnly = $website->scan_type === 'nested';

        // extract all relevant urls from sitemap
        if ($shouldExtractUrls) {
            $urls = (new ParseSitemap(
                nestedOnly: $extractNestedUrlsOnly,
            ))->execute($url);
            if ($urls && count($urls) > 0) {
                $this->createWebpagesForIngesting($website, $urls);
            }
        }

        // process the initial specified url
        $this->processWebpage(
            $website,
            $website->url,
            extractUrls: $shouldExtractUrls,
            document: $document,
        );
    }

    public function processWebpageIngestQueue(): void
    {
        // get website that is in pending state
        $website = AiAgentWebsite::where('scan_pending', true)
            ->orderBy('updated_at', 'desc')
            ->first();
        if (!$website) {
            return;
        }

        // if all pages are processed, mark website as fully scanned
        if (!$website->webpages()->where('scan_pending', true)->exists()) {
            $this->markWebsiteAsFinished($website);
            return;
        }

        // get pages that are pending and not claimed by another process
        $pages = $this->getPendingPagesForScanning($website);
        if ($pages->isEmpty()) {
            return;
        }

        // mark these pages as being claimed so concurrent processing works
        AiAgentWebpage::whereIn('id', $pages->pluck('id'))->update([
            'scan_started_at' => now(),
        ]);

        foreach ($pages as $page) {
            $this->processWebpage(
                $website,
                $page->url,
                extractUrls: !$website->isSinglePage(),
            );
        }

        // check again if all pages have been processed for the website
        if (!$website->webpages()->where('scan_pending', true)->exists()) {
            $this->markWebsiteAsFinished($website);
        }
    }

    protected function markWebsiteAsFinished(AiAgentWebsite $website): void
    {
        $website->update([
            'scan_pending' => false,
        ]);

        // delete pages that were previously scanned, but no longer exist on website
        $pagesToDelete = $website
            ->webpages()
            ->where('scan_version', '<', $website->scan_version)
            ->pluck('id');
        DB::transaction(function () use ($pagesToDelete) {
            AiAgentWebpage::deleteMultiple($pagesToDelete);
        });
    }

    protected function getPendingPagesForScanning(
        AiAgentWebsite $website,
    ): Collection {
        return $website
            ->webpages()
            ->where('scan_pending', true)
            // where scan not started by another process yet or started more than 10 minutes
            // ago and not finished. We can assume it failed for some reason in that case
            ->where(function ($query) {
                $query
                    ->whereNull('scan_started_at')
                    ->orWhere('scan_started_at', '<', now()->subMinutes(10));
            })
            ->limit($this->pagesToProcessPerRun)
            ->selectAllExceptContent()
            ->get();
    }

    protected function processWebpage(
        AiAgentWebsite $website,
        string $url,
        bool $extractUrls = true,
        array|null $document = null,
    ): void {
        $urlHash = AiAgentWebpage::hashUrl($url);
        $scraper = new WebsiteScraper();
        $rawDocument = $document ?? $scraper->scrape($url);
        $webpage = $website->webpages()->where('url_hash', $urlHash)->first();

        // retry failed scrape up to 3 times, then delete the webpage
        if ($webpage && !$rawDocument) {
            if ($webpage->scan_tries < 3) {
                $webpage->increment('scan_tries');
            } else {
                $webpage->delete();
            }
            return;
        }

        $markdown = $scraper->htmlToMarkdown(
            $rawDocument['html'],
            $url,
            config: $website->scrape_config,
        );

        // could not extract any content from the page
        if ($markdown === null) {
            if ($webpage->scan_tries < 3) {
                $webpage->increment('scan_tries');
            } else {
                $webpage->delete();
            }
            return;
        }

        $contentHash = AiAgentWebpage::hashContent($markdown);

        if (!$webpage) {
            // if we already scanned a page with identical content, bail
            if ($website->hasPageWithContent($contentHash)) {
                return;
            }

            $webpage = $website->webpages()->create([
                'url' => $url,
                'title' => $rawDocument['title'],
            ]);
        }

        if ($webpage->content_hash !== $contentHash) {
            if ($website->hasPageWithContent($contentHash, $webpage->id)) {
                $webpage->delete();
                return;
            }

            (new GenerateChunksForDocument())->execute($webpage, $markdown);

            $webpage->update([
                'url' => $url,
                'title' => $rawDocument['title'],
                'markdown' => $markdown,
                'content_hash' => $contentHash,
                'fully_scanned' => true,
                'scan_pending' => false,
                'scan_started_at' => null,
                'scan_version' => $website->scan_version,
                'last_full_scan_version' => $website->scan_version,
            ]);
        } else {
            $webpage->update([
                'fully_scanned' => true,
                'scan_pending' => false,
                'scan_started_at' => null,
                'scan_version' => $website->scan_version,
                'last_full_scan_version' => $website->scan_version,
            ]);
        }

        if ($extractUrls) {
            $urls = $scraper->extractUrls(
                $url,
                $rawDocument['html'],
                nestedOnly: $webpage->scan_type !== 'full',
            );
            $this->createWebpagesForIngesting($website, $urls);
        }
    }

    protected function createWebpagesForIngesting(
        AiAgentWebsite $website,
        Collection|array $urls,
    ): void {
        $urls = collect($urls)->map(
            fn(string $url) => [
                'url' => $url,
                'url_hash' => AiAgentWebsite::hashUrl($url),
                'ai_agent_website_id' => $website->id,
                'scan_pending' => true,
                'scan_version' => $website->scan_version,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        );

        $urls->chunk(200)->each(function ($urls) use ($website) {
            $existingWebpages = $website
                ->webpages()
                ->whereIn('url_hash', $urls->pluck('url_hash'))
                ->get([
                    'id',
                    'url_hash',
                    'scan_version',
                    'scan_pending',
                    'last_full_scan_version',
                ]);

            // update scan version
            $website
                ->webpages()
                ->wherein('id', $existingWebpages->pluck('id'))
                ->update([
                    'scan_version' => $website->scan_version,
                ]);

            // update scan pending, if not already scanned for this version
            $toMarkAsPending = $existingWebpages
                ->filter(
                    fn(AiAgentWebpage $page) => !$page->scan_pending &&
                        $page->last_full_scan_version !==
                            $website->scan_version,
                )
                ->pluck('id');
            if (!$toMarkAsPending->isEmpty()) {
                $website
                    ->webpages()
                    ->whereIn('id', $toMarkAsPending)
                    ->update([
                        'scan_pending' => true,
                    ]);
            }

            // insert new webpages for syncing
            $website
                ->webpages()
                ->insert(
                    $urls
                        ->filter(
                            fn($url) => !$existingWebpages->contains(
                                'url_hash',
                                $url['url_hash'],
                            ),
                        )
                        ->toArray(),
                );
        });
    }
}
