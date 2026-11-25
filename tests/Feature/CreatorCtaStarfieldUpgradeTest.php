<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CreatorCtaStarfieldUpgradeTest extends TestCase
{
    use DatabaseTransactions;

    private function stockCta(): array
    {
        return [
            'name' => 'cta-simple-centered',
            'title' => "Make something worth sharing. We'll help you sell it.",
            'description' => 'Give your next customer one simple place to find everything you create.',
            'buttons' => [[
                'label' => 'Create your storefront',
                'action' => '/register',
                'type' => 'route',
                'variant' => 'default',
                'color' => 'primary',
            ]],
        ];
    }

    public function test_only_unchanged_cta_receives_starfield(): void
    {
        $hero = ['name' => 'hero-simple-centered', 'title' => 'My custom hero'];
        settings()->save(['landingPage' => ['sections' => [$hero, $this->stockCta()]]]);
        $migration = require database_path('migrations/2026_11_25_160000_upgrade_untouched_creator_cta.php');
        $migration->up();

        $page = json_decode(DB::table('settings')->where('name', 'landingPage')->value('value'), true);
        $this->assertSame($hero, $page['sections'][0]);
        $this->assertSame('starfield', $page['sections'][1]['presentation']);
        $this->assertSame('/register', $page['sections'][1]['buttons'][0]['action']);

        $migration->up();
        $again = json_decode(DB::table('settings')->where('name', 'landingPage')->value('value'), true);
        $this->assertSame($page, $again);
    }

    public function test_custom_cta_is_never_changed(): void
    {
        $custom = $this->stockCta();
        $custom['title'] = 'Our own launch message';
        settings()->save(['landingPage' => ['sections' => [$custom]]]);
        $migration = require database_path('migrations/2026_11_25_160000_upgrade_untouched_creator_cta.php');
        $migration->up();

        $page = json_decode(DB::table('settings')->where('name', 'landingPage')->value('value'), true);
        $this->assertSame($custom, $page['sections'][0]);
    }
}
