<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Persist the Creators admin nav item into settings.menus (live DB),
 * matching resources/defaults/default-settings.php. Defaults alone do
 * not update existing installations.
 */
return new class extends Migration
{
    private const ITEM_ID = 'admin-creators';

    private const ITEM = [
        'label' => 'Creators',
        'action' => '/admin/creators',
        'type' => 'route',
        'id' => self::ITEM_ID,
        'permissions' => ['users.update'],
    ];

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
            $positions = $menu['positions'] ?? [];
            if (! in_array('admin-sidebar', $positions, true)) {
                continue;
            }

            $items = $menu['items'] ?? [];
            foreach ($items as $item) {
                if (($item['id'] ?? null) === self::ITEM_ID || ($item['action'] ?? null) === '/admin/creators') {
                    return;
                }
            }

            $insertAt = count($items);
            foreach ($items as $index => $item) {
                if (($item['action'] ?? null) === '/admin/users') {
                    $insertAt = $index + 1;
                    break;
                }
            }

            array_splice($items, $insertAt, 0, [self::ITEM]);
            $menu['items'] = array_values($items);
            $changed = true;
            break;
        }
        unset($menu);

        if (! $changed) {
            return;
        }

        DB::table('settings')->where('name', 'menus')->update([
            'value' => json_encode($menus),
        ]);
        Cache::forget('settings.public');
    }

    public function down(): void
    {
        $setting = DB::table('settings')->where('name', 'menus')->first();
        if (! $setting) {
            return;
        }

        $menus = json_decode($setting->value, true);
        if (! is_array($menus)) {
            return;
        }

        foreach ($menus as &$menu) {
            if (! in_array('admin-sidebar', $menu['positions'] ?? [], true)) {
                continue;
            }
            $menu['items'] = array_values(array_filter(
                $menu['items'] ?? [],
                fn (array $item): bool => ($item['id'] ?? null) !== self::ITEM_ID
                    && ($item['action'] ?? null) !== '/admin/creators',
            ));
        }
        unset($menu);

        DB::table('settings')->where('name', 'menus')->update([
            'value' => json_encode($menus),
        ]);
        Cache::forget('settings.public');
    }
};
