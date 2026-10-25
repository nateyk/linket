<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * BeDesk agent shell expects a menus[].positions entry of "dashboard-sidebar".
 * Linket only had creator dashboard menus, so /agent rendered an empty nav.
 */
return new class extends Migration {
    private const MENU_ID = 'agent-dashboard-sidebar';

    private const POSITION = 'dashboard-sidebar';

    /**
     * @return list<array{type: string, label: string, action: string, id: string, permissions?: list<string>}>
     */
    private function items(): array
    {
        return [
            [
                'type' => 'route',
                'label' => 'Conversations',
                'action' => '/agent/conversations?viewId=mine',
                'id' => 'agent-nav-conversations',
                'permissions' => ['conversations.update'],
            ],
            [
                'type' => 'route',
                'label' => 'Team',
                'action' => '/agent/team',
                'id' => 'agent-nav-team',
                'permissions' => ['agents.update'],
            ],
            [
                'type' => 'route',
                'label' => 'Customers',
                'action' => '/agent/customers',
                'id' => 'agent-nav-customers',
                'permissions' => ['users.update'],
            ],
            [
                'type' => 'route',
                'label' => 'Help center',
                'action' => '/agent/hc/arrange',
                'id' => 'agent-nav-hc',
                'permissions' => ['articles.update'],
            ],
            [
                'type' => 'route',
                'label' => 'Reports',
                'action' => '/agent/reports',
                'id' => 'agent-nav-reports',
                'permissions' => ['reports.view'],
            ],
            [
                'type' => 'route',
                'label' => 'Saved replies',
                'action' => '/agent/saved-replies',
                'id' => 'agent-nav-saved-replies',
                'permissions' => ['canned_replies.update'],
            ],
        ];
    }

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

        $exists = collect($menus)->contains(
            fn (array $menu): bool => in_array(
                self::POSITION,
                $menu['positions'] ?? [],
                true,
            ),
        );

        if ($exists) {
            return;
        }

        $items = $this->items();
        foreach ($items as $index => &$item) {
            $item['order'] = $index;
        }
        unset($item);

        $menus[] = [
            'name' => 'Agent dashboard sidebar',
            'id' => self::MENU_ID,
            'positions' => [self::POSITION],
            'items' => $items,
        ];

        DB::table('settings')
            ->where('name', 'menus')
            ->update(['value' => json_encode($menus)]);

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

        $menus = array_values(
            array_filter(
                $menus,
                fn (array $menu): bool => ($menu['id'] ?? null) !== self::MENU_ID
                    && ! in_array(self::POSITION, $menu['positions'] ?? [], true),
            ),
        );

        DB::table('settings')
            ->where('name', 'menus')
            ->update(['value' => json_encode($menus)]);

        Cache::forget('settings.public');
    }
};
