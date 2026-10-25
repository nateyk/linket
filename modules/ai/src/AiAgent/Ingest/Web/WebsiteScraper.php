<?php

namespace Ai\AiAgent\Ingest\Web;

use Ai\AiAgent\Ingest\Parsing\HtmlToMarkdown;
use Ai\AiAgent\Ingest\Parsing\MarkitdownParser;
use Exception;
use fivefilters\Readability\Configuration;
use fivefilters\Readability\ParseException;
use fivefilters\Readability\Readability;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Str;
use InvalidArgumentException;
use Symfony\Component\BrowserKit\HttpBrowser;
use Symfony\Component\DomCrawler\Crawler;
use Symfony\Component\DomCrawler\Link;

class WebsiteScraper
{
    public function scrape(string $url): ?array
    {
        $host = parse_url($url, PHP_URL_HOST);
        $browser = new HttpBrowser();
        try {
            $crawler = $browser->request(
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

        $title = $crawler->filter('title')->text();
        $language = $this->detectLanguage($crawler);

        return [
            'html' => $crawler->html(),
            'title' => $title,
            'language' => $language,
            'host' => $host,
        ];
    }

    public function extractUrls(
        string $parentUrl,
        string $html,
        bool $nestedOnly = false,
    ): Collection {
        $parentUrl = rtrim($parentUrl, '/');
        return collect((new Crawler($html, $parentUrl))->filter('a')->links())
            ->map(function (Link $link) use ($parentUrl) {
                $url = $link->getUri();

                // convert relative URLs to absolute
                $parsedUrl = parse_url($url);
                if (!isset($parsedUrl['host'])) {
                    $baseHost = rtrim($parentUrl, '/');
                    $path = ltrim($parsedUrl['path'] ?? '', '/');
                    $url = $baseHost . '/' . $path;
                }

                // remove search and hash
                return strtok($url, '?#');
            })
            ->filter(function ($url) use ($parentUrl, $nestedOnly) {
                $parsedHost = parse_url($url, PHP_URL_HOST);

                if ($parsedHost !== parse_url($parentUrl, PHP_URL_HOST)) {
                    return false;
                }

                if ($nestedOnly) {
                    return Str::of($url)->is("$parentUrl/*");
                }

                return true;
            })
            ->unique()
            ->take(100);
    }

    public function htmlToMarkdown(
        string $html,
        string $url,
        array|null $config = [],
    ): string|null {
        $host = parse_url($url, PHP_URL_HOST);

        $html = $this->tryToExtractOnlyRelevantContent($html, $config);

        if ($html === null) {
            return null;
        }

        if (config('app.ai_agent_document_parser') === 'markitdown') {
            $html = (new MarkitdownParser())->parseContent($html);
        } else {
            $html = $this->purifyHtml($host, $html);
            $html = trim($this->convertToMarkdown($html));
        }

        return $html;
    }

    protected function tryToExtractOnlyRelevantContent(
        string $html,
        array|null $config = [],
    ): string|null {
        $crawler = new Crawler($html);

        if (isset($config['contentCssSelector'])) {
            $crawler = $crawler->filter($config['contentCssSelector']);
        } else {
            $crawler = $crawler->filter('body');
        }

        $excludeSelector =
            'script, style, head, noscript, aside, template, svg, button, footer, nav, dialog, iframe, img';
        if (isset($config['cssSelectorsToExclude'])) {
            $excludeSelector .= ', ' . $config['cssSelectorsToExclude'];
        }

        $crawler->filter($excludeSelector)->each(function (Crawler $node) {
            foreach ($node as $n) {
                $n->parentNode->removeChild($n);
            }
        });

        // remove line numbers from code blocks
        $crawler->filter('pre .line-number')->each(function (Crawler $node) {
            foreach ($node as $n) {
                $n->parentNode->removeChild($n);
            }
        });

        try {
            return $crawler->html();
        } catch (Exception $e) {
            return null;
        }
    }

    protected function purifyHtml(string $host, string $html): string
    {
        $purifiedHtml = htmLawed($html, [
            'elements' =>
                'p,h1,h2,h3,h4,h5,h6,ul,ol,li,pre,code,table,thead,tbody,tr,td,th,a[href]',
            'any_custom_element' => 0,
            'base_url' => $host,
            'comment' => 1,
            'safe' => 1,
            'deny_attribute' => '* -href',
            'abs_url' => 1,
        ]);

        // remove empty tags
        $purifiedHtml = str_replace('<p></p>', '', $purifiedHtml);
        $purifiedHtml = str_replace('<code></code>', '', $purifiedHtml);
        $purifiedHtml = str_replace('<pre></pre>', '', $purifiedHtml);

        return $purifiedHtml;
    }

    protected function convertToMarkdown(string $html): string
    {
        return (new HtmlToMarkdown())->execute($html);
    }

    protected function detectLanguage(Crawler $crawler): ?string
    {
        // Check for language specified in the <html> tag's "lang" attribute
        $lang = $crawler->filter('html')->attr('lang');
        if ($lang) {
            return $lang;
        }

        // If not found, look for a meta tag with a specific language attribute
        $metaLang = $crawler
            ->filter('meta[http-equiv="content-language"]')
            ->attr('content');
        if ($metaLang) {
            return $metaLang;
        }

        // If still not found, check for a meta tag with "name=language"
        $namedLanguageMeta = $crawler
            ->filter('meta[name="language"]')
            ->attr('content');
        if ($namedLanguageMeta) {
            return $namedLanguageMeta;
        }

        return null;
    }
}
