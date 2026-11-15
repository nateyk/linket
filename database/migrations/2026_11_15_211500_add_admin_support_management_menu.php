<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const SUPPORT_ACTION = '/admin/support';

    private const SUPPORT_ID = 'admin-support-management';

    public function up(): void
    {
        $setting = DB::table('settings')->where('name', 'menus')->first();
        $menus = json_decode($setting?->value ?? '', true);
        if (! is_array($menus)) {
            return;
        }

        $changed = false;
        foreach ($menus as &$menu) {
            if (! in_array('admin-sidebar', $menu['positions'] ?? [], true)) {
                continue;
            }

            $items = $menu['items'] ?? [];
            if ($this->alreadyPresent($items)) {
                continue;
            }

            $position = $this->insertionPosition($items);
            array_splice($items, $position, 0, [[
                'id' => self::SUPPORT_ID,
                'label' => 'Support',
                'action' => self::SUPPORT_ACTION,
                'type' => 'route',
                'permissions' => ['admin.access'],
            ]]);

            foreach ($items as $index => &$item) {
                $item['order'] = $index;
            }
            unset($item);

            $menu['items'] = $items;
            $changed = true;
        }
        unset($menu);

        if ($changed) {
            DB::table('settings')->where('name', 'menus')->update([
                'value' => json_encode($menus, JSON_UNESCAPED_SLASHES),
                'updated_at' => now(),
            ]);
            Cache::forget('settings.public');
        }
    }

    private function alreadyPresent(array $items): bool
    {
        foreach ($items as $item) {
            if (($item['id'] ?? null) === self::SUPPORT_ID
                || ($item['action'] ?? null) === self::SUPPORT_ACTION) {
                return true;
            }
        }

        return false;
    }

    private function insertionPosition(array $items): int
    {
        foreach ($items as $index => $item) {
            if (($item['id'] ?? null) === 'admin-help-center'
                || ($item['action'] ?? null) === '/admin/help') {
                return $index;
            }
        }

        return 0;
    }

    public function down(): void
    {
        // Leave customized navigation intact; a rolled-back deployment must
        // not overwrite or reorder an administrator's menu preferences.
    }
};
