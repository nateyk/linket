<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Livechat and AI Agent are settings pages. Remove the extra admin sidebar
 * entries so they open from Settings instead of sitting between Creators and Withdrawals.
 */
return new class extends Migration
{
    /** @var list<string> */
    private const ACTIONS = ['/admin/settings/livechat', '/admin/settings/ai'];

    /** @var list<string> */
    private const IDS = ['fufr42', 'fzvw42'];

    public function up(): void
    {
        $menus = $this->menus();
        if ($menus === null) {
            return;
        }

        foreach ($menus as &$menu) {
            if (! in_array('admin-sidebar', $menu['positions'] ?? [], true)) {
                continue;
            }

            $menu['items'] = array_values(array_filter(
                $menu['items'] ?? [],
                fn (array $item): bool => ! in_array($item['action'] ?? null, self::ACTIONS, true)
                    && ! in_array($item['id'] ?? null, self::IDS, true),
            ));
        }
        unset($menu);

        $this->store($menus);
    }

    public function down(): void
    {
        $menus = $this->menus();
        if ($menus === null) {
            return;
        }

        foreach ($menus as &$menu) {
            if (! in_array('admin-sidebar', $menu['positions'] ?? [], true)) {
                continue;
            }

            $items = $menu['items'] ?? [];
            $actions = collect($items)->pluck('action');
            if (! $actions->contains('/admin/settings/livechat')) {
                $items[] = [
                    'label' => 'Livechat',
                    'action' => '/admin/settings/livechat',
                    'type' => 'route',
                    'id' => 'fufr42',
                    'permissions' => ['settings.update'],
                ];
            }
            if (! $actions->contains('/admin/settings/ai')) {
                $items[] = [
                    'label' => 'AI Agent',
                    'action' => '/admin/settings/ai',
                    'type' => 'route',
                    'id' => 'fzvw42',
                    'permissions' => ['settings.update'],
                ];
            }
            $menu['items'] = array_values($items);
        }
        unset($menu);

        $this->store($menus);
    }

    /** @return list<array<string, mixed>>|null */
    private function menus(): ?array
    {
        $setting = DB::table('settings')->where('name', 'menus')->first();
        if (! $setting) {
            return null;
        }

        $menus = json_decode($setting->value, true);

        return is_array($menus) ? $menus : null;
    }

    /** @param list<array<string, mixed>> $menus */
    private function store(array $menus): void
    {
        DB::table('settings')->where('name', 'menus')->update([
            'value' => json_encode($menus),
        ]);
        Cache::forget('settings.public');
    }
};
