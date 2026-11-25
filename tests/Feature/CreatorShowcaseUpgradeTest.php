<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CreatorShowcaseUpgradeTest extends TestCase
{
    use DatabaseTransactions;

    private function oldStockSections(): array
    {
        $snapshot = json_decode(file_get_contents(resource_path('defaults/creator-showcase-pre-migration.json')), true);

        return [$snapshot['store'], $snapshot['payment']];
    }

    public function test_untouched_sections_upgrade_without_affecting_unrelated_content(): void
    {
        [$store, $checkout] = $this->oldStockSections();
        $other = ['name' => 'hero-simple-centered', 'title' => 'Custom hero'];
        settings()->save(['landingPage' => ['sections' => [$other, $store, $checkout]]]);

        $migration = require database_path('migrations/2026_11_25_170000_upgrade_untouched_storefront_payment_showcase.php');
        $migration->up();
        $page = json_decode(DB::table('settings')->where('name', 'landingPage')->value('value'), true);
        $this->assertSame($other, $page['sections'][0]);
        $this->assertSame('browser', $page['sections'][1]['mediaVariant']);
        $this->assertSame('checkout', $page['sections'][2]['mediaVariant']);
        $this->assertStringContainsString('verified settlement', $page['sections'][2]['description']);

        $migration->up();
        $again = json_decode(DB::table('settings')->where('name', 'landingPage')->value('value'), true);
        $this->assertSame($page, $again);
    }

    public function test_custom_screenshot_and_copy_are_never_overwritten(): void
    {
        [$store, $checkout] = $this->oldStockSections();
        $store['image']['src'] = '/my/storefront-desktop.webp';
        $checkout['description'] = 'My existing policy copy';
        settings()->save(['landingPage' => ['sections' => [$store, $checkout]]]);

        $migration = require database_path('migrations/2026_11_25_170000_upgrade_untouched_storefront_payment_showcase.php');
        $migration->up();
        $page = json_decode(DB::table('settings')->where('name', 'landingPage')->value('value'), true);
        $this->assertSame([$store, $checkout], $page['sections']);
    }
}
