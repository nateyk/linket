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

        $landing = json_decode($setting->value, true);
        if (!is_array($landing)) {
            return;
        }

        $changed = false;

        foreach ($landing['sections'] ?? [] as &$section) {
            if (str_starts_with($section['name'] ?? '', 'hero-')) {
                $section['showSearchBarSlot'] = false;
                $changed = true;
            }
        }
        unset($section);

        if ($changed) {
            DB::table('settings')
                ->where('name', 'landingPage')
                ->update(['value' => json_encode($landing)]);
        }
    }

    public function down(): void
    {
        // Irreversible — hero slot restoration is not supported
    }
};