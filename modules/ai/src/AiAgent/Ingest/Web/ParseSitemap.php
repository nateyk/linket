<?php

namespace Ai\AiAgent\Ingest\Web;

use Illuminate\Support\Str;
use Symfony\Component\BrowserKit\HttpBrowser;
use Symfony\Component\DomCrawler\Crawler;

class ParseSitemap
{
    protected array $urls = [];
    protected string $parentUrl;

    public function __construct(
        protected $urlLimit = 1000,
        protected $nestedOnly = true,
    ) {}

    public function execute(string $url): array|null
    {
        $parts = parse_url($url);
        $this->parentUrl = $url;
        return $this->parseSitemap("$parts[scheme]://$parts[host]/sitemap.xml");
    }

    protected function parseSitemap(string $url): array|null
    {
        $browser = new HttpBrowser();

        try {
            $crawler = $browser->useHtml5Parser(false)->request(
                'GET',
                $url,
                server: [
                    'HTTP_USER_AGENT' =>
                        'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
                ],
            );
        } catch (\Exception $e) {
            return null;
        }

        if (!$crawler->count()) {
            return null;
        }

        $index = $crawler->filter('sitemapindex');
        $isSitemapIndex = $index->count() > 0;

        // is sitemap index, fetch all sitemaps and parse them
        if ($isSitemapIndex) {
            $sitemapUrls = $this->getUrls($index);
            if (empty($sitemapUrls)) {
                return null;
            }

            foreach ($sitemapUrls as $sitemapUrl) {
                $this->parseSitemap($sitemapUrl);

                if (count($this->urls) >= $this->urlLimit) {
                    break;
                }
            }
        } else {
            $this->urls = array_merge(
                $this->urls,
                $this->filterUrls($this->getUrls($crawler)),
            );
        }

        return empty($this->urls)
            ? null
            : array_slice($this->urls, 0, $this->urlLimit);
    }

    protected function getUrls(Crawler $crawler): array
    {
        return $crawler
            // find all loc nodes, regardless of any namespaces specified
            ->filterXPath("//*[local-name()='loc']")
            ->each(function (Crawler $node) use (&$urls) {
                return $node->text();
            });
    }

    protected function filterUrls(array $urls): array
    {
        return array_filter($urls, function ($url) {
            if ($this->nestedOnly) {
                return Str::of($url)->is("$this->parentUrl/*");
            } else {
                return true;
            }
        });
    }
}
