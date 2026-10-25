<?php

use Common\Settings\Models\Setting;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration {
    public function up(): void
    {
        $setting = Setting::where('name', 'menus')->first();
        if (! $setting) {
            return;
        }

        $menus = $setting->value ?? [];
        if (! is_array($menus) || $menus === []) {
            return;
        }

        foreach ($menus as &$menu) {
            $positions = $menu['positions'] ?? [];
            $items = $menu['items'] ?? [];

            if (
                in_array('dashboard-sidebar', $positions, true) &&
                ($menu['id'] ?? null) === 'agent-dashboard-sidebar'
            ) {
                $already = collect($items)->contains(
                    fn ($item) => in_array($item['id'] ?? null, [
                        'fzfw41',
                        'agent-nav-ai-agents',
                    ], true),
                );
                if (! $already) {
                    array_splice($items, min(4, count($items)), 0, [
                        [
                            'label' => 'AI Agent',
                            'action' => '/agent/ai-agent/settings',
                            'type' => 'route',
                            'id' => 'agent-nav-ai-agents',
                            'permissions' => ['conversations.update'],
                        ],
                    ]);
                }
            }

            if (in_array('admin-sidebar', $positions, true)) {
                $already = collect($items)->contains(
                    fn ($item) => ($item['id'] ?? null) === 'fzvw42',
                );
                if (! $already) {
                    array_splice($items, min(8, count($items)), 0, [
                        [
                            'label' => 'AI Agent',
                            'action' => '/admin/settings/ai',
                            'type' => 'route',
                            'id' => 'fzvw42',
                            'permissions' => ['settings.update'],
                        ],
                    ]);
                }
            }

            $menu['items'] = $items;
        }
        unset($menu);

        $setting->update(['value' => $menus]);
    }
};
