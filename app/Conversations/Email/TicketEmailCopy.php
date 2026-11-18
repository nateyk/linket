<?php

namespace App\Conversations\Email;

final class TicketEmailCopy
{
    public static function plain(mixed $body): string
    {
        if (! is_string($body) || $body === '') {
            return '';
        }

        $text = preg_replace('/<br\s*\/?>/i', "\n", $body) ?? $body;
        $text = html_entity_decode(strip_tags($text), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = preg_replace("/[ \t]+/", ' ', $text) ?? $text;

        return trim($text);
    }
}
