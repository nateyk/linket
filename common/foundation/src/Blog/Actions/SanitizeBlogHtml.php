<?php

namespace Common\Blog\Actions;

use HTMLPurifier;
use HTMLPurifier_Config;

/**
 * Strips unsafe markup from blog article bodies.
 *
 * Runs server-side on save so a sanitised copy is what gets stored and
 * searched. The client additionally sanitises before rendering, but a
 * client-only allowlist is not a security boundary — anything that reads
 * `body` straight from the database (prerender views, JSON-LD excerpt
 * generation, feeds) would otherwise see raw input.
 */
class SanitizeBlogHtml
{
    private HTMLPurifier|null $purifier = null;

    public function execute(string|null $html): string
    {
        if ($html === null || trim($html) === '') {
            return '';
        }

        return $this->purifier()->purify($html);
    }

    private function purifier(): HTMLPurifier
    {
        if ($this->purifier !== null) {
            return $this->purifier;
        }

        $config = HTMLPurifier_Config::createDefault();
        $config->set('Cache.SerializerPath', null);
        $config->set('HTML.Allowed', implode(',', [
            'p[style]',
            'br',
            'strong',
            'b',
            'em',
            'i',
            'u',
            's',
            'sub',
            'sup',
            'h1',
            'h2',
            'h3',
            'h4',
            'blockquote',
            'ul',
            'ol',
            'li',
            'a[href|title|target|rel]',
            'img[src|alt|title|width|height]',
            'code',
            'pre',
            'hr',
            'table',
            'thead',
            'tbody',
            'tr',
            'th',
            'td',
        ]));

        // Blocks javascript:, data:, and vbscript: hrefs.
        $config->set('URI.AllowedSchemes', [
            'http' => true,
            'https' => true,
            'mailto' => true,
            'tel' => true,
        ]);

        // Editor-inserted external links open safely.
        $config->set('HTML.TargetBlank', true);
        $config->set('HTML.Nofollow', false);
        $config->set('Attr.AllowedFrameTargets', ['_blank']);

        return $this->purifier = new HTMLPurifier($config);
    }
}