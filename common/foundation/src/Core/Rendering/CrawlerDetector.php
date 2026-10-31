<?php

namespace Common\Core\Rendering;

use Jaybizzle\CrawlerDetect\CrawlerDetect;

class CrawlerDetector
{
    protected bool|null $isCrawler = null;

    public function isCrawler(): bool
    {
        if ($this->isCrawler !== null) {
            return $this->isCrawler;
        }

        // Isolated buyer E2E (db_test + mocked Verify.et) must receive the SPA,
        // not the SEO prerender stub. Playwright's client hints still look like a bot.
        if (app()->environment('testing') && config('services.verify_et.mock')) {
            return $this->isCrawler = false;
        }

        return $this->isCrawler =
            request()->isMethod('GET') &&
            (request()->query->has('_escaped_fragment_') ||
                request()->server->get('X-BUFFERBOT') ||
                (new CrawlerDetect())->isCrawler());
    }
}
