<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $row = DB::table('settings')->where('name', 'menus')->first();
        $original = json_decode($row?->value ?? '', true);
        if (! is_array($original)) {
            return;
        }

        $menus = $original;
        foreach ($menus as $index => $menu) {
            if (is_array($menu)) {
                $menus[$index] = $this->canonicalizeAdminMenu($menu);
            }
        }

        if ($menus !== $original) {
            DB::table('settings')->where('name', 'menus')->update([
                'value' => json_encode($menus, JSON_UNESCAPED_SLASHES),
                'updated_at' => now(),
            ]);
        }
    }

    private function canonicalizeAdminMenu(array $menu): array
    {
        if (! in_array('admin-sidebar', $menu['positions'] ?? [], true)) {
            return $menu;
        }

        $seenHelp = false;
        $items = [];
        foreach ($menu['items'] ?? [] as $item) {
            if ($this->isHelpCenterEntry($item)) {
                if ($seenHelp) {
                    continue;
                }
                $item = $this->canonicalHelpCenterEntry($item);
                $seenHelp = true;
            }

            $item['order'] = count($items);
            $items[] = $item;
        }

        $menu['items'] = $items;

        return $menu;
    }

    private function isHelpCenterEntry(array $item): bool
    {
        if (($item['id'] ?? null) === 'admin-help-center') {
            return true;
        }

        return ($item['label'] ?? null) === 'Help center'
            && in_array($item['action'] ?? null, [
                '/admin/help',
                '/admin/settings/hc',
                '/admin/settings/help',
            ], true);
    }

    private function canonicalHelpCenterEntry(array $item): array
    {
        $item['action'] = '/admin/help';
        $item['permissions'] = ['articles.update'];

        return $item;
    }

    public function down(): void
    {
        // Do not restore broken navigation; appearance settings remain at
        // /admin/settings/hc, accessible from Help Center management.
    }
};
