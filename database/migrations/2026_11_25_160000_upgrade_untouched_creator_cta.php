<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        $setting = DB::table('settings')->where('name', 'landingPage')->first();
        if (! $setting) {
            return;
        }
        $page = json_decode($setting->value, true);
        if (! is_array($page['sections'] ?? null)) {
            return;
        }

        // Do not overwrite an admin-customized call-to-action.
        $previousDefault = json_decode(<<<'JSON'
{
    "name": "cta-simple-centered",
    "title": "Make something worth sharing. We'll help you sell it.",
    "description": "Give your next customer one simple place to find everything you create.",
    "buttons": [
        {
            "label": "Create your storefront",
            "action": "/register",
            "type": "route",
            "variant": "default",
            "color": "primary"
        }
    ]
}
JSON, true);
        foreach ($page['sections'] as $index => $section) {
            if (! is_array($section) || $section != $previousDefault) {
                continue;
            }
            $page['sections'][$index]['presentation'] = 'starfield';
            DB::table('settings')->where('name', 'landingPage')->update([
                'value' => json_encode($page, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            ]);
            break;
        }
    }

    public function down(): void
    {
        // Editor-managed choices are intentionally not undone.
    }
};
