<?php

namespace App\HelpCenter\Actions;

use HTMLPurifier;
use HTMLPurifier_Config;

/**
 * Help Center articles render HTML in the main site and live-chat widget.
 * Always sanitize at the model boundary, including legacy database content.
 */
class SanitizeHelpCenterHtml
{
    private ?HTMLPurifier $purifier = null;

    public function execute(?string $html): string
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
        $config->set('Core.Encoding', 'UTF-8');
        $config->set('Cache.SerializerPath', null);
        $config->set('HTML.Allowed', implode(',', [
            'p[style|class]', 'br', 'span[style|class]', 'div[style|class]',
            'b', 'strong', 'em', 'i', 'u', 's', 'strike', 'sub', 'sup',
            'h1[id|style]', 'h2[id|style]', 'h3[id|style]',
            'h4[id|style]', 'h5[id|style]', 'h6[id|style]',
            'blockquote', 'ul', 'ol', 'li',
            'a[href|title|target|rel]',
            'img[src|alt|title|width|height|class]',
            'pre[class]', 'code[class]', 'hr',
            'table', 'thead', 'tbody', 'tfoot',
            'tr', 'th[colspan|rowspan|style]', 'td[colspan|rowspan|style]',
            'iframe[src|width|height|frameborder]',
        ]));

        $config->set('URI.AllowedSchemes', [
            'http' => true,
            'https' => true,
            'mailto' => true,
            'tel' => true,
        ]);
        $config->set('CSS.AllowedProperties', [
            'text-align', 'color', 'background-color', 'font-weight',
            'font-style', 'text-decoration', 'width', 'height',
        ]);
        $config->set('HTML.TargetBlank', true);
        $config->set('Attr.AllowedFrameTargets', ['_blank']);

        // Tiptap permits embeds. Keep video embeds from known providers, but
        // never let arbitrary iframes execute inside the Linket origin.
        $config->set('HTML.SafeIframe', true);
        $config->set(
            'URI.SafeIframeRegexp',
            '%^https://(?:(?:www\.)?youtube(?:-nocookie)?\.com/embed/[A-Za-z0-9_-]+|player\.vimeo\.com/video/[0-9]+)(?:[/?#].*)?$%i',
        );

        return $this->purifier = new HTMLPurifier($config);
    }
}
