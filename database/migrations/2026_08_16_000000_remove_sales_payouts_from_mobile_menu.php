<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $setting = DB::table('settings')->where('name', 'menus')->first();
        if (!$setting) {
            return;
        }

        $menus = json_decode($setting->value, true);
        if (!is_array($menus)) {
            return;
        }

        $changed = false;

        foreach ($menus as &$menu) {
            $positions = $menu['positions'] ?? [];
            if (!in_array('dashboard-mobile', $positions)) {
                continue;
            }

            $items = $menu['items'] ?? [];
            if (!is_array($items)) {
                continue;
            }

            $filtered = array_values(array_filter(
                $items,
                fn ($item) => ($item['action'] ?? null) !== '/dashboard/sales-payouts',
            ));

            if (count($filtered) !== count($items)) {
                $menu['items'] = $filtered;
                $changed = true;
            }
        }

        if ($changed) {
            DB::table('settings')
                ->where('name', 'menus')
                ->update(['value' => json_encode($menus)]);
        }
    }

    public function down(): void
    {
        // Irreversible — item restoration is not supported
    }
};