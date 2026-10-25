<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Remove legacy addon menu splices (/dashboard/*) and duplicate labels from the
 * agent helpdesk sidebar; align AI Agent with /agent/ai-agent/settings.
 */
return new class extends Migration {
    private const MENU_ID = 'agent-dashboard-sidebar';

    /** @return list<array<string, mixed>> */
    private function canonicalItems(): array
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
                'label' => 'Campaigns',
                'action' => '/agent/campaigns',
                'id' => 'agent-nav-campaigns',
                'permissions' => ['campaigns.update'],
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
                'label' => 'AI Agent',
                'action' => '/agent/ai-agent/settings',
                'id' => 'agent-nav-ai-agents',
                'permissions' => ['conversations.update'],
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

        $index = null;
        foreach ($menus as $i => $menu) {
            if (($menu['id'] ?? null) === self::MENU_ID) {
                $index = $i;
                break;
            }
        }

        if ($index === null) {
            return;
        }

        $items = $this->canonicalItems();
        foreach ($items as $order => &$item) {
            $item['order'] = $order;
        }
        unset($item);

        $menus[$index]['id'] = self::MENU_ID;
        $menus[$index]['name'] = 'Agent dashboard sidebar';
        $menus[$index]['positions'] = ['dashboard-sidebar'];
        $menus[$index]['items'] = $items;

        DB::table('settings')
            ->where('name', 'menus')
            ->update(['value' => json_encode($menus)]);

        Cache::forget('settings.public');
    }

    public function down(): void
    {
        //
    }
};
