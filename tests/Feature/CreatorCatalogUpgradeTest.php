<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CreatorCatalogUpgradeTest extends TestCase
{
    use DatabaseTransactions;

    private function previousStockCatalog(): array
    {
        return json_decode(<<<'JSON'
{
    "name": "features-grid",
    "title": "Your ideas come in all forms. Your storefront can too.",
    "description": "Sell what you know, share what you make, and offer your services from the same page.",
    "badge": "What you can create",
    "maxColumns": 4,
    "iconsOnTop": true,
    "features": [
        {
            "icon": "stores",
            "title": "Ebooks and guides",
            "description": "Publish useful guides and digital reading materials."
        },
        {
            "icon": "links",
            "title": "Digital downloads",
            "description": "Offer templates, files, and creative resources."
        },
        {
            "icon": "date",
            "title": "Courses and learning",
            "description": "Share your knowledge with course content and lessons."
        },
        {
            "icon": "settings",
            "title": "Creator services",
            "description": "Let customers discover your skills and request your services."
        }
    ]
}
JSON, true);
    }

    private function runCatalogUpgrade(): void
    {
        $migration = require database_path('migrations/2026_11_25_110000_upgrade_stock_creator_catalog.php');
        $migration->up();
    }

    public function test_only_the_untouched_stock_product_section_is_upgraded(): void
    {
        $customHero = ['name' => 'hero-simple-centered', 'title' => 'My custom hero'];
        $customFooter = ['name' => 'footer'];
        settings()->save(['landingPage' => [
            'sections' => [$customHero, $this->previousStockCatalog(), $customFooter],
        ]]);

        $this->runCatalogUpgrade();

        $page = json_decode(DB::table('settings')->where('name', 'landingPage')->value('value'), true);
        $this->assertSame($customHero, $page['sections'][0]);
        $this->assertSame($customFooter, $page['sections'][2]);
        $this->assertSame('catalog', $page['sections'][1]['presentation']);
        $this->assertSame('Sell more than just downloads', $page['sections'][1]['title']);
        $this->assertCount(4, $page['sections'][1]['features']);

        // Migration must remain idempotent on subsequent deployments.
        $this->runCatalogUpgrade();
        $again = json_decode(DB::table('settings')->where('name', 'landingPage')->value('value'), true);
        $this->assertSame($page, $again);
    }

    public function test_admin_modified_categories_and_uploaded_media_remain_untouched(): void
    {
        $custom = $this->previousStockCatalog();
        $custom['features'][0]['title'] = 'My own guides';
        $custom['features'][0]['image'] = ['src' => '/uploads/ebook.webp'];
        settings()->save(['landingPage' => ['sections' => [$custom]]]);

        $this->runCatalogUpgrade();

        $page = json_decode(DB::table('settings')->where('name', 'landingPage')->value('value'), true);
        $this->assertSame($custom, $page['sections'][0]);
        $this->assertArrayNotHasKey('presentation', $page['sections'][0]);
    }
}
