<?php

namespace App\Links\Actions;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Symfony\Component\DomCrawler\Crawler;

class GetMetadataFromUrl
{
    public function execute(string $url): array
    {
        $normalizedUrl = self::normalizeUrl($url);
        $parsed = parse_url($normalizedUrl);
        $default = [
            'name' => $parsed['host'] ?? null,
            'description' => null,
            'image' => null,
        ];

        // don't try to parse video or image urls, only html and text
        if (!$this->shouldDownloadUrlContent($normalizedUrl)) {
            return [];
        }

        // in case url is not reachable
        try {
            $content = Http::timeout(5)
                ->accept('text/html')
                ->withUserAgent($this->getUserAgent())
                ->get($normalizedUrl)
                ->body();
        } catch (\Exception) {
            return [];
        }

        if (!$content) {
            return [];
        }

        $crawler = new Crawler($content);
        $title =
            head($crawler->filter('title')->extract(['_text'])) ?:
            head(
                $crawler
                    ->filter('meta[property="og:title"]')
                    ->extract(['content']),
            );
        $description =
            head(
                $crawler
                    ->filter('meta[name="description"]')
                    ->extract(['content']),
            ) ?:
            head(
                $crawler
                    ->filter('meta[property="og:description"]')
                    ->extract(['content']),
            );
        $image = $this->getImageFromMetaTags($crawler);

        return [
            'name' => Str::limit($title ? trim($title) : $default['name'], 100),
            'description' => $description
                ? Str::limit(trim($description), 190)
                : null,
            'image' => $image ?: null,
        ];
    }

    public static function normalizeUrl(string $url): string
    {
        // make sure there are no more than 2 slashes in the URL
        $url = preg_replace('/\/{3,}/', '//', $url);
        $url = trim($url, '/');

        $scheme = parse_url($url, PHP_URL_SCHEME);
        $url = !$scheme ? "https://$url" : $url;

        $parsedUrl = parse_url($url);

        if (!mb_check_encoding($parsedUrl['host'], 'ASCII')) {
            $asciiHost = idn_to_ascii(
                $parsedUrl['host'],
                0,
                INTL_IDNA_VARIANT_UTS46,
            );
            if ($asciiHost) {
                $url = str_replace($parsedUrl['host'], $asciiHost, $url);
            }
        }

        return $url;
    }

    protected function shouldDownloadUrlContent(string $url): bool
    {
        try {
            $response = Http::timeout(5)
                ->withUserAgent($this->getUserAgent())
                ->head($url);
        } catch (\Exception $e) {
            return false;
        }

        $contentLength = (int) ($response->header('content-length') ?? 0);
        $maxBytes = 5 * 1024 * 1024;

        if ($contentLength > $maxBytes) {
            return false;
        }

        return Str::startsWith(
            strtolower((string) $response->header('content-type')),
            'text/',
        );
    }

    protected function getImageFromMetaTags(Crawler $crawler): ?string
    {
        $tags = [
            [
                'tagName' => 'meta[property="og:image"]',
                'attributeName' => 'content',
            ],
            [
                'tagName' => 'meta[property="og:image:secure_url"]',
                'attributeName' => 'content',
            ],
            [
                'tagName' => 'meta[name="twitter:image"]',
                'attributeName' => 'content',
            ],
            [
                'tagName' => 'meta[name="twitter:image:src"]',
                'attributeName' => 'content',
            ],
            [
                'tagName' => 'link[rel="apple-touch-icon"]',
                'attributeName' => 'href',
            ],
            [
                'tagName' => 'link[rel="apple-touch-icon-precomposed"]',
                'attributeName' => 'href',
            ],
            ['tagName' => 'link[rel="mask-icon"]', 'attributeName' => 'href'],
            ['tagName' => 'link[rel="fluid-icon"]', 'attributeName' => 'href'],
            ['tagName' => 'link[rel="icon"]', 'attributeName' => 'href'],
            [
                'tagName' => 'link[rel="shortcut icon"]',
                'attributeName' => 'href',
            ],
        ];
        $image = null;

        foreach ($tags as $tag) {
            $image = head(
                $crawler
                    ->filter($tag['tagName'])
                    ->extract([$tag['attributeName']]),
            );
            if ($image) {
                break;
            }
        }

        if (is_string($image) && strlen($image) < 200) {
            return $image;
        }

        return null;
    }

    protected function getUserAgent(): string
    {
        return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36';
    }
}
