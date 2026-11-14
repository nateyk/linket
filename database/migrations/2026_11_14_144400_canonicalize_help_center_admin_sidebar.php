<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $row = DB::table('settings')->where('name', 'menus')->first();
        if (! $row) {
            return;
        }

        $menus = json_decode($row->value ?? '', true);
        if (! is_array($menus)) {
            return;
        }

        $changed = false;
        foreach ($menus as &$menu) {
            if (! in_array('admin-sidebar', $menu['positions'] ?? [], true)) {
                continue;
            }

            $seenHelp = false;
            $items = [];
            foreach ($menu['items'] ?? [] as $item) {
                $isHelp = ($item['id'] ?? null) === 'admin-help-center'
                    || (($item['label'] ?? null) === 'Help center'
                        && in_array($item['action'] ?? null, [
                            '/admin/help',
                            '/admin/settings/hc',
                            '/admin/settings/help',
                        ], true));

                if ($isHelp) {
                    if ($seenHelp) {
                        $changed = true;

                        continue;
                    }

                    $seenHelp = true;
                    if (($item['action'] ?? '') !== '/admin/help'
                        || ($item['permissions'] ?? []) !== ['articles.update']) {
                        $changed = true;
                    }
                    $item['action'] = '/admin/help';
                    $item['permissions'] = ['articles.update'];
                }

                $item['order'] = count($items);
                $items[] = $item;
            }

            $menu['items'] = $items;
        }
        unset($menu);

        if ($changed) {
            DB::table('settings')->where('name', 'menus')->update([
                'value' => json_encode($menus, JSON_UNESCAPED_SLASHES),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        // Deliberately do not restore a broken navigation URL on rollback.
        // The settings page continues to exist at /admin/settings/hc.
    }
};
