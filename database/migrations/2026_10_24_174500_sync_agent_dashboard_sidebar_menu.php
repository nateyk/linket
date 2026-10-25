<?php

use Common\Permissions\Models\Permission;
use Common\Roles\Models\Role;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Keep agent sidebar menu in sync with defaults (Campaigns, AI Agents, etc.)
 * and ensure platform admin can see agent nav items via Agents role.
 */
return new class extends Migration {
    private const MENU_ID = 'agent-dashboard-sidebar';

    private const POSITION = 'dashboard-sidebar';

    /**
     * @return list<array<string, mixed>>
     */
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
        Permission::query()->firstOrCreate(['name' => 'campaigns.update']);

        $agentsRole = Role::query()->where('name', 'Agents')->first();
        if ($agentsRole) {
            $campaignPermId = Permission::query()
                ->where('name', 'campaigns.update')
                ->value('id');
            if ($campaignPermId) {
                $agentsRole->permissions()->syncWithoutDetaching([
                    $campaignPermId => ['restrictions' => json_encode([])],
                ]);
            }
        }

        $adminUser = DB::table('users')
            ->where('email', 'admin@admin.com')
            ->first();
        if ($adminUser && $agentsRole) {
            DB::table('user_role')->insertOrIgnore([
                'user_id' => $adminUser->id,
                'role_id' => $agentsRole->id,
            ]);
        }

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
            if (in_array(self::POSITION, $menu['positions'] ?? [], true)) {
                $index = $i;
                break;
            }
        }

        $items = $this->canonicalItems();
        foreach ($items as $order => &$item) {
            $item['order'] = $order;
        }
        unset($item);

        if ($index === null) {
            $menus[] = [
                'name' => 'Agent dashboard sidebar',
                'id' => self::MENU_ID,
                'positions' => [self::POSITION],
                'items' => $items,
            ];
        } else {
            $menus[$index]['id'] = self::MENU_ID;
            $menus[$index]['name'] = 'Agent dashboard sidebar';
            $menus[$index]['positions'] = [self::POSITION];
            $menus[$index]['items'] = $items;
        }

        DB::table('settings')
            ->where('name', 'menus')
            ->update(['value' => json_encode($menus)]);

        Cache::forget('settings.public');
    }

    public function down(): void
    {
        // Menu shape is forward-only; no rollback.
    }
};
