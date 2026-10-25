<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        $setting = DB::table('settings')->where('name', 'menus')->first();
        if (! $setting) {
            return;
        }

        $menus = json_decode($setting->value, true);
        if (! is_array($menus)) {
            return;
        }

        $changed = false;
        foreach ($menus as &$menu) {
            if (! in_array('dashboard-sidebar', $menu['positions'] ?? [], true)) {
                continue;
            }
            foreach ($menu['items'] as &$item) {
                if (($item['id'] ?? null) === 'agent-nav-ai-agents') {
                    $item['action'] = '/agent/ai-agent/settings';
                    $changed = true;
                }
            }
        }
        unset($menu, $item);

        if ($changed) {
            DB::table('settings')
                ->where('name', 'menus')
                ->update(['value' => json_encode($menus)]);
            Cache::forget('settings.public');
        }
    }

    public function down(): void
    {
        //
    }
};
