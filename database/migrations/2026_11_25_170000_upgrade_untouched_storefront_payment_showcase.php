<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        $row = DB::table('settings')->where('name', 'landingPage')->first();
        if (! $row) return;

        $page = json_decode($row->value, true);
        $preset = json_decode(file_get_contents(resource_path('defaults/creator-homepage.json')), true);
        if (! is_array($page['sections'] ?? null) || ! is_array($preset['sections'] ?? null)) {
            return;
        }

        // Apply only to the exact old stock sections. Any edited copy,
        // replacement screenshots or extra sections remain untouched.
        $originalStore = json_decode(<<<'JSON'
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
}
JSON, true);
        $originalPayment = json_decode(<<<'JSON'
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
JSON, true);

        $updated = false;
        foreach ($page['sections'] as $i => $section) {
            if (! is_array($section)) continue;
            if ($section == $originalStore) {
                $page['sections'][$i] = $preset['sections'][2];
                $updated = true;
            } elseif ($section == $originalPayment) {
                $page['sections'][$i] = $preset['sections'][4];
                $updated = true;
            }
        }
        if ($updated) {
            DB::table('settings')->where('name', 'landingPage')->update([
                'value' => json_encode($page, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            ]);
        }
    }

    public function down(): void
    {
        // Never roll back editorial content chosen by an administrator.
    }
};
