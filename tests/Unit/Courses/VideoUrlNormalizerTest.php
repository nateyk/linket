<?php

use App\Courses\Services\VideoUrlNormalizer;

it('normalizes youtube watch urls to youtube-nocookie embeds with privacy params', function () {
    $url = VideoUrlNormalizer::normalize('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

    expect($url)->toStartWith('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
        ->and($url)->toContain('modestbranding=1')
        ->and($url)->toContain('rel=0')
        ->and($url)->toContain('playsinline=1');
});

it('normalizes vimeo urls to player embeds', function () {
    $url = VideoUrlNormalizer::normalize('https://vimeo.com/123456789');

    expect($url)->toStartWith('https://player.vimeo.com/video/123456789')
        ->and($url)->toContain('title=0')
        ->and($url)->toContain('byline=0')
        ->and($url)->toContain('portrait=0');
});
