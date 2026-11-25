<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $row = DB::table('settings')->where('name', 'landingPage')->first();
        if (! $row) {
            return;
        }

        $page = json_decode($row->value, true);
        $preset = json_decode(file_get_contents(resource_path('defaults/creator-homepage.json')), true);
        if (! is_array($page['sections'] ?? null) || ! is_array($preset['sections'][3] ?? null)) {
            return;
        }

        // Never replace an administrator-customized category section or other
        // landing-page content. Only the exact previous stock section qualifies.
        $stock = json_decode(<<<'JSON'
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

        foreach ($page['sections'] as $index => $section) {
            if (! is_array($section) || $section != $stock) {
                continue;
            }

            $page['sections'][$index] = $preset['sections'][3];
            DB::table('settings')->where('name', 'landingPage')->update([
                'value' => json_encode($page, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            ]);
            break;
        }
    }

    public function down(): void
    {
        // The editor may have changed media since migration: never overwrite it.
    }
};
