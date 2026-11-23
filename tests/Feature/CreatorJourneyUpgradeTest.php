<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CreatorJourneyUpgradeTest extends TestCase
{
    use DatabaseTransactions;

    private function originalJourney(): array
    {
        return json_decode(<<<'JSON'
{
    "name": "features-grid",
    "title": "From your first idea to your first sale",
    "description": "Your page is more than a list of links. Give your audience one place to discover your work and support what you create.",
    "badge": "A simpler way to start",
    "maxColumns": 3,
    "iconsOnTop": true,
    "mutedBg": true,
    "features": [
        {
            "icon": "stores",
            "title": "Make it yours",
            "description": "Build a mobile-first storefront that reflects your style, content, and brand."
        },
        {
            "icon": "links",
            "title": "Share what you create",
            "description": "Publish digital products, courses, services, and useful links in one place."
        },
        {
            "icon": "insights",
            "title": "Run your business",
            "description": "Follow your orders, completed sales, and audience activity from one dashboard."
        }
    ]
}
JSON, true);
    }

    public function test_only_the_untouched_stock_journey_is_upgraded(): void
    {
        $customHero = ['name' => 'hero-simple-centered', 'title' => 'My custom hero'];
        $customFaq = ['name' => 'faq', 'title' => 'My FAQ'];
        settings()->save(['landingPage' => [
            'sections' => [$customHero, $this->originalJourney(), $customFaq],
        ]]);

        $migration = require database_path('migrations/2026_11_23_160000_upgrade_stock_creator_journey.php');
        $migration->up();

        $stored = json_decode(DB::table('settings')->where('name', 'landingPage')->value('value'), true);
        $this->assertSame($customHero, $stored['sections'][0]);
        $this->assertSame($customFaq, $stored['sections'][2]);
        $this->assertSame('journey', $stored['sections'][1]['presentation']);
        $this->assertCount(3, $stored['sections'][1]['features']);
        $this->assertSame('images/landing/creator-storefront.svg', $stored['sections'][1]['features'][0]['image']['src']);
    }

    public function test_customized_creator_journey_is_preserved(): void
    {
        $custom = $this->originalJourney();
        $custom['features'][0]['title'] = 'My changed journey step';
        settings()->save(['landingPage' => [
            'sections' => [$custom],
        ]]);

        $migration = require database_path('migrations/2026_11_23_160000_upgrade_stock_creator_journey.php');
        $migration->up();

        $stored = json_decode(DB::table('settings')->where('name', 'landingPage')->value('value'), true);
        $this->assertSame($custom, $stored['sections'][0]);
        $this->assertArrayNotHasKey('presentation', $stored['sections'][0]);
    }
}
