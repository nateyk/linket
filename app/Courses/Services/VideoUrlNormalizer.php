<?php

namespace App\Courses\Services;

class VideoUrlNormalizer
{
    /**
     * Validate and normalize YouTube/Vimeo URLs. Returns canonical embed URL or null.
     * Never allows arbitrary iframe HTML.
     */
    public static function normalize(?string $url): ?string
    {
        if (!$url) return null;
        $url = trim($url);
        if (!filter_var($url, FILTER_VALIDATE_URL)) {
            abort(422, 'Invalid video URL.');
        }

        // Use get-video-id equivalent logic — lightweight regex allowlist.
        $youtube = self::parseYoutube($url);
        if ($youtube) {
            return 'https://www.youtube-nocookie.com/embed/' . $youtube
                . '?modestbranding=1&rel=0&playsinline=1';
        }

        $vimeo = self::parseVimeo($url);
        if ($vimeo) {
            return 'https://player.vimeo.com/video/' . $vimeo
                . '?title=0&byline=0&portrait=0';
        }

        abort(422, 'Video URL must be a YouTube or Vimeo link.');
    }

    public static function isAllowed(string $url): bool
    {
        return (bool) (self::parseYoutube($url) || self::parseVimeo($url));
    }

    private static function parseYoutube(string $url): ?string
    {
        // Covers youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, shorts
        $patterns = [
            '#(?:youtube\.com/watch\?v=|youtube\.com/embed/|youtu\.be/|youtube\.com/shorts/)([A-Za-z0-9_-]{6,})#',
            '#youtube\.com.*[?&]v=([A-Za-z0-9_-]{6,})#',
        ];
        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $url, $m)) {
                return $m[1];
            }
        }
        return null;
    }

    private static function parseVimeo(string $url): ?string
    {
        if (preg_match('#vimeo\.com/(?:video/)?(\d+)#', $url, $m)) {
            return $m[1];
        }
        return null;
    }
}
