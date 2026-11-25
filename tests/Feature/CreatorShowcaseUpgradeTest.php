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
        return json_decode(<<<'JSON'
[
    {
        "name": "feature-with-screenshot",
        "title": "Not just a bio page. Your own corner of the internet.",
        "description": "Give your personal brand and your business one home. Visitors can explore your work, discover products, and find the right way to connect with you.",
        "badge": "A storefront that's yours",
        "presentation": "creator",
        "wrapIconsInBg": false,
        "imageSize": "lg",
        "alignLeft": false,
        "image": {
            "src": "images/landing/creator-storefront.svg",
            "width": 1280,
            "height": 880
        },
        "features": [
            {
                "icon": "brand",
                "title": "Make it look like you",
                "description": "Choose colors, layouts, images, and the content people see first."
            },
            {
                "icon": "stores",
                "title": "Sell from your own page",
                "description": "Keep your products alongside your profile and links instead of sending buyers away."
            },
            {
                "icon": "insights",
                "title": "Built for mobile",
                "description": "Showcase your work on the screens your audience uses every day."
            }
        ]
    },
    {
        "name": "feature-with-screenshot",
        "title": "Your sales. Your customers. Your money.",
        "description": "Buyers pay for eligible digital products through Chapa checkout. Access is granted after payment confirmation. Creators can request withdrawals of eligible earnings.",
        "badge": "Payments built for Ethiopian creators",
        "presentation": "creator",
        "forceDarkMode": true,
        "wrapIconsInBg": false,
        "imageSize": "lg",
        "alignLeft": true,
        "image": {
            "src": "images/landing/creator-checkout.svg",
            "width": 1280,
            "height": 880
        },
        "features": [
            {
                "icon": "settings",
                "title": "Chapa checkout",
                "description": "Offer a hosted payment experience for eligible paid digital products."
            },
            {
                "icon": "insights",
                "title": "Payment confirmation",
                "description": "Paid digital downloads unlock after successful payment confirmation."
            },
            {
                "icon": "stores",
                "title": "Reliable purchase access",
                "description": "Eligible buyers can access their purchases and authorized re-downloads."
            }
        ]
    }
]
JSON, true);
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
