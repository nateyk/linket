<?php

namespace Tests\Feature;

use Tests\TestCase;

class CreatorHomepagePresetTest extends TestCase
{
    public function test_default_creator_homepage_is_valid_and_editable(): void
    {
        $config = json_decode(file_get_contents(resource_path('defaults/creator-homepage.json')), true);
        $this->assertIsArray($config['sections'] ?? null);
        $this->assertSame('One link. Your entire creator business.', $config['sections'][0]['title']);
        $this->assertSame('creator', $config['sections'][0]['presentation']);
        $this->assertSame('images/landing/creator-hero.svg', $config['sections'][0]['image']['src']);
        $this->assertContains('pricing', array_column($config['sections'], 'name'));
        $this->assertContains('faq', array_column($config['sections'], 'name'));
        $this->assertSame('/register', $config['sections'][0]['buttons'][0]['action']);
        $this->assertStringNotContainsString('500', $config['sections'][6]['title']);
    }

    public function test_default_settings_and_preset_share_the_same_sections(): void
    {
        $defaults = collect(require resource_path('defaults/default-settings.php'));
        $landing = json_decode($defaults->firstWhere('name', 'landingPage')['value'], true);
        $preset = json_decode(file_get_contents(resource_path('defaults/creator-homepage.json')), true);
        $this->assertSame($preset, $landing);
    }
}
