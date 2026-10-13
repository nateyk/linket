<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * The Help Center admin page (/admin/settings/help, with Articles/Categories
 * tabs) has always shipped, but only as a tab nested inside Settings — the
 * admin sidebar never linked it, so admins reported they could not find it.
 *
 * Add a "Help center" entry to the Admin Sidebar menu directly after
 * "Settings", mirroring the JSON-walk pattern of
 * 2026_10_10_000001_fix_items_menu_actions. Items are renumbered sequentially
 * so every order-aware consumer keeps a stable sequence.
 */
return new class extends Migration
{
    private const ACTION = '/admin/settings/help';

    private const AFTER = '/admin/settings';

    public function up(): void
    {
        $this->mutateAdminSidebar(function (array $items): array {
            if ($this->indexOf($items, self::ACTION) !== null) {
                return $items;
            }

            $help = [
                'label' => 'Help center',
                'action' => self::ACTION,
                'type' => 'route',
                'id' => 'admin-help-center',
                'permissions' => ['settings.update'],
            ];

            $afterIndex = $this->indexOf($items, self::AFTER);
            if ($afterIndex === null) {
                $items[] = $help;
            } else {
                array_splice($items, $afterIndex + 1, 0, [$help]);
            }

            return $items;
        });
    }

    public function down(): void
    {
        $this->mutateAdminSidebar(
            fn(array $items): array => array_values(
                array_filter(
                    $items,
                    fn($item) => ($item['action'] ?? null) !== self::ACTION,
                ),
            ),
        );
    }

    /**
     * @param  callable(array<int, array>): array<int, array>  $mutate
     */
    private function mutateAdminSidebar(callable $mutate): void
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
            if (!in_array('admin-sidebar', $menu['positions'] ?? [], true)) {
                continue;
            }

            $items = array_values($menu['items'] ?? []);
            $mutated = array_values($mutate($items));

            if ($mutated === $items) {
                continue;
            }

            // renumber so the sequence stays 0..n-1 regardless of how the
            // items were previously ordered.
            foreach ($mutated as $index => &$item) {
                $item['order'] = $index;
            }
            unset($item);

            $menu['items'] = $mutated;
            $changed = true;
        }
        unset($menu);

        if ($changed) {
            DB::table('settings')
                ->where('name', 'menus')
                ->update(['value' => json_encode($menus)]);

            // menus are served through the cached settings blob.
            Cache::forget('settings.public');
        }
    }

    /**
     * @param  array<int, array>  $items
     */
    private function indexOf(array $items, string $action): int|null
    {
        foreach ($items as $index => $item) {
            if (($item['action'] ?? null) === $action) {
                return $index;
            }
        }

        return null;
    }
};
