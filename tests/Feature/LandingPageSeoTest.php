<?php

namespace Tests\Feature;

use Tests\TestCase;

class LandingPageSeoTest extends TestCase
{
    public function test_homepage_metadata_describes_creators_and_uses_the_configured_share_image(): void
    {
        settings()->set('branding.site_name', 'Linket');
        settings()->set('branding.social_image', 'storage/branding-images/share.png');

        $html = view('seo.landing-page.seo-tags')->render();

        $this->assertStringContainsString('<title>Linket - Digital Products for Ethiopian Creators</title>', $html);
        $this->assertStringNotContainsString('URL Shortener', $html);
        $this->assertStringContainsString('property="og:image"', $html);
        $this->assertStringContainsString(asset('storage/branding-images/share.png'), $html);
        $this->assertStringContainsString('name="twitter:card" content="summary_large_image"', $html);
        $this->assertStringContainsString('name="twitter:description"', $html);
    }

    public function test_missing_share_image_does_not_emit_a_broken_image_tag(): void
    {
        settings()->set('branding.social_image', null);

        $html = view('seo.landing-page.seo-tags')->render();

        $this->assertStringNotContainsString('property="og:image"', $html);
        $this->assertStringNotContainsString('name="twitter:image"', $html);
        $this->assertStringContainsString('name="twitter:card" content="summary"', $html);
    }

    public function test_prerender_uses_the_same_resolved_sections_as_the_client(): void
    {
        settings()->set('landingPage', ['sections' => [[
            'name' => 'hero-simple-centered',
            'title' => 'Stale settings title',
            'description' => 'Stale settings description',
        ]]]);

        $html = view('seo.landing-page.prerender', [
            'htmlBaseUri' => url('/'),
            'sections' => [[
                'name' => 'hero-simple-centered',
                'title' => 'Resolved creator headline',
                'description' => 'Resolved creator description',
                'buttons' => [['label' => 'Start creating', 'action' => '/register']],
            ]],
        ])->render();

        $this->assertStringContainsString('<h1>Resolved creator headline</h1>', $html);
        $this->assertStringContainsString('Resolved creator description', $html);
        $this->assertStringContainsString('href="/register"', $html);
        $this->assertStringNotContainsString('Stale settings title', $html);
    }

    public function test_prerender_escapes_section_content(): void
    {
        settings()->set('landingPage', null);

        $html = view('seo.landing-page.prerender', [
            'htmlBaseUri' => url('/'),
            'sections' => [[
                'name' => 'hero-simple-centered',
                'title' => '<script>alert(1)</script>',
                'description' => 'Safe & sound',
            ]],
        ])->render();

        $this->assertStringContainsString('&lt;script&gt;alert(1)&lt;/script&gt;', $html);
        $this->assertStringContainsString('Safe &amp; sound', $html);
        $this->assertStringNotContainsString('<script>alert(1)</script>', $html);
    }
}
