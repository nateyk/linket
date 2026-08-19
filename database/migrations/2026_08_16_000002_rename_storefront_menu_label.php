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
            if (!isset($menu['items']) || !is_array($menu['items'])) {
                continue;
            }

            foreach ($menu['items'] as &$item) {
                $action = str_replace('\\/', '/', $item['action'] ?? '');
                if (
                    $action === '/dashboard/biolinks' &&
                    ($item['label'] ?? null) === 'Storefront'
                ) {
                    $item['label'] = 'My Card';
                    $changed = true;
                }
            }
            unset($item);
        }
        unset($menu);

        if ($changed) {
            DB::table('settings')
                ->where('name', 'menus')
                ->update(['value' => json_encode($menus)]);
        }
    }

    public function down(): void
    {
        // Irreversible — label restoration is not supported
    }
};