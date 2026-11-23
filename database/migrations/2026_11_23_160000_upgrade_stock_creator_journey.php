<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $setting = DB::table('settings')->where('name', 'landingPage')->first();
        if (!$setting) {
            return;
        }

        $page = json_decode($setting->value, true);
        $preset = json_decode(file_get_contents(resource_path('defaults/creator-homepage.json')), true);
        if (!is_array($page['sections'] ?? null) || !is_array($preset['sections'][1] ?? null)) {
            return;
        }

        // Upgrade only the untouched stock journey; preserve every other
        // section and any administrator-edited version of this section.
        $original = json_decode(<<<'JSON'
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

        foreach ($page['sections'] as $index => $section) {
            if (!is_array($section) || $section != $original) {
                continue;
            }

            $page['sections'][$index] = $preset['sections'][1];
            DB::table('settings')->where('name', 'landingPage')->update([
                'value' => json_encode($page, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            ]);
            break;
        }
    }

    public function down(): void
    {
        // A rollback must not overwrite subsequent editor changes.
    }
};
