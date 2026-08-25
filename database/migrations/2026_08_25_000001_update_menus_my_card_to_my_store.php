<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        $row = DB::table('settings')->where('name', 'menus')->first();
        if (!$row) {
            return;
        }
        $menus = json_decode($row->value, true);
        if (!is_array($menus)) {
            return;
        }
        $changed = false;
        foreach ($menus as &$menu) {
            if (!isset($menu['positions'], $menu['items']) || !is_array($menu['items'])) {
                continue;
            }
            $isDashboard = in_array('dashboard-primary', $menu['positions'] ?? [], true)
                || in_array('dashboard-mobile', $menu['positions'] ?? [], true);
            if (!$isDashboard) {
                continue;
            }
            foreach ($menu['items'] as &$item) {
                if (($item['label'] ?? null) === 'My Card' && ($item['action'] ?? null) === '/dashboard/biolinks') {
                    $item['label'] = 'My Store';
                    $item['action'] = '/dashboard/stores';
                    $changed = true;
                }
                if (($item['label'] ?? null) === 'Stores' && ($item['action'] ?? null) === '/dashboard/stores') {
                    $item['label'] = 'My Store';
                    $changed = true;
                }
                if (($item['action'] ?? null) === '/dashboard/biolinks') {
                    $item['action'] = '/dashboard/stores';
                    $changed = true;
                }
                if (($item['label'] ?? null) === 'My Card') {
                    $item['label'] = 'My Store';
                    $changed = true;
                }
            }
            unset($item);
        }
        unset($menu);
        if ($changed) {
            DB::table('settings')->where('name', 'menus')->update(['value' => json_encode($menus)]);
            // flush settings cache if exists
            try {
                if (function_exists('settings')) {
                    // clear cached menus
                }
            } catch (\Throwable $e) {
            }
        }
    }

    public function down(): void
    {
        $row = DB::table('settings')->where('name', 'menus')->first();
        if (!$row) return;
        $menus = json_decode($row->value, true);
        if (!is_array($menus)) return;
        foreach ($menus as &$menu) {
            foreach ($menu['items'] ?? [] as &$item) {
                if (($item['label'] ?? null) === 'My Store' && ($item['action'] ?? null) === '/dashboard/stores') {
                    $item['label'] = 'My Card';
                    $item['action'] = '/dashboard/biolinks';
                }
            }
        }
        DB::table('settings')->where('name', 'menus')->update(['value' => json_encode($menus)]);
    }
};
