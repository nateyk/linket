<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Help center and Blog were surfaced in the Admin Sidebar pointing at their
 * nested Settings locations (/admin/settings/help, /admin/settings/blog), but
 * neither is a Settings page — they are standalone admin sections. Rewrite
 * those sidebar actions to the top-level routes /admin/help and /admin/blog,
 * keeping them in place (directly after Settings / Help center) and keeping
 * their labels, types and permissions.
 *
 * Mirrors the JSON-walk pattern of 2026_10_13_000001_add_help_center_to_admin_sidebar.
 */
return new class extends Migration
{
    /** @var array<string, string> old nested action => new top-level action */
    private const REWRITES = [
        '/admin/settings/help' => '/admin/help',
        '/admin/settings/blog' => '/admin/blog',
    ];

    public function up(): void
    {
        $this->mutateAdminSidebar(function (array $items): array {
            foreach ($items as $index => $item) {
                $action = $item['action'] ?? null;
                if (!isset(self::REWRITES[$action])) {
                    continue;
                }

                $newAction = self::REWRITES[$action];

                // if the new path is already present (e.g. a fresh install
                // that shipped the top-level defaults), drop the duplicate
                // instead of rewriting it.
                $alreadyPresent = collect($items)->contains(
                    fn(array $existing) =>
                        ($existing['action'] ?? null) === $newAction,
                );

                if ($alreadyPresent) {
                    unset($items[$index]);
                } else {
                    $items[$index]['action'] = $newAction;
                }
            }

            // returning items unchanged lets mutateAdminSidebar detect a
            // no-op via identity comparison (same pattern as 000001).
            return $items;
        });
    }

    public function down(): void
    {
        $this->mutateAdminSidebar(function (array $items): array {
            $rewrites = array_flip(self::REWRITES);

            foreach ($items as $index => $item) {
                $action = $item['action'] ?? null;
                if (!isset($rewrites[$action])) {
                    continue;
                }
                $items[$index]['action'] = $rewrites[$action];
            }

            return $items;
        });
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
};
