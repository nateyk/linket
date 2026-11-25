<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        $row = DB::table('settings')->where('name', 'landingPage')->first();
        if (! $row) return;

        $page = json_decode($row->value, true);
        $legacy = json_decode(file_get_contents(resource_path('defaults/creator-showcase-pre-migration.json')), true);
        $preset = json_decode(file_get_contents(resource_path('defaults/creator-homepage.json')), true);
        if (! is_array($page['sections'] ?? null) || ! is_array($legacy) || ! is_array($preset['sections'] ?? null)) return;

        $changed = false;
        foreach ($page['sections'] as $i => $section) {
            if ($section == $legacy['store']) {
                $page['sections'][$i] = $preset['sections'][2];
                $changed = true;
            } elseif ($section == $legacy['payment']) {
                $page['sections'][$i] = $preset['sections'][4];
                $changed = true;
            }
        }

        if ($changed) {
            DB::table('settings')->where('name', 'landingPage')->update([
                'value' => json_encode($page, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            ]);
        }
    }

    public function down(): void
    {
        // Editorial settings may have changed since migration; never overwrite them.
    }
};
