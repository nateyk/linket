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

        $stored = json_decode($setting->value, true);
        if (!is_array($stored)) {
            return;
        }

        // Respect anything the administrator has changed. Only migrate the
        // previous stock landing page, including its historical CTA-slot toggle.
        $legacy = require resource_path('defaults/legacy-link-homepage-2026.php');
        $current = $stored['sections'] ?? null;
        $old = $legacy['sections'] ?? null;
        if (!is_array($current) || !is_array($old)) {
            return;
        }

        foreach ($current as &$item) {
            if (is_array($item) && ($item['name'] ?? null) === 'hero-split-with-screenshot') {
                unset($item['showSearchBarSlot']);
            }
        }
        unset($item);
        foreach ($old as &$item) {
            if (is_array($item) && ($item['name'] ?? null) === 'hero-split-with-screenshot') {
                unset($item['showSearchBarSlot']);
            }
        }
        unset($item);

        if ($current !== $old) {
            return;
        }

        DB::table('settings')->where('name', 'landingPage')->update([
            'value' => file_get_contents(resource_path('defaults/creator-homepage.json')),
        ]);
    }

    public function down(): void
    {
        // Administrator changes made after deployment must never be reverted.
    }
};
