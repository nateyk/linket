<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Blog management (Articles + Categories at /admin/settings/blog) shipped with
 * the blog feature but was not linked from any nav, so admins could not find
 * it. Add a "Blog" entry to the Admin Sidebar menu directly after "Help
 * center", mirroring 2026_10_13_000001_add_help_center_to_admin_sidebar.
 */
return new class extends Migration
{
    private const ACTION = '/admin/settings/blog';

    private const AFTER = '/admin/settings/help';

    public function up(): void
    {
        $this->mutateAdminSidebar(function (array $items): array {
            if ($this->indexOf($items, self::ACTION) !== null) {
                return $items;
            }

            $item = [
                'label' => 'Blog',
                'action' => self::ACTION,
                'type' => 'route',
                'id' => 'admin-blog',
                'permissions' => ['settings.update'],
            ];

            $afterIndex = $this->indexOf($items, self::AFTER);
            if ($afterIndex === null) {
                $items[] = $item;
            } else {
                array_splice($items, $afterIndex + 1, 0, [$item]);
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
