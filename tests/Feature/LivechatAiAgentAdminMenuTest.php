<?php

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;

uses(DatabaseTransactions::class);

function runLivechatAiAgentMenuMigration(): object
{
    return require database_path('migrations/2026_11_07_173600_move_livechat_and_ai_agent_into_settings.php');
}

function seedAdminSidebarWithSupportShortcuts(): void
{
    DB::table('settings')->updateOrInsert(
        ['name' => 'menus'],
        [
            'value' => json_encode([
                [
                    'name' => 'Admin Sidebar',
                    'id' => 'a07',
                    'positions' => ['admin-sidebar'],
                    'items' => [
                        ['type' => 'route', 'label' => 'Settings', 'action' => '/admin/settings', 'id' => 'settings'],
                        ['type' => 'route', 'label' => 'Creators', 'action' => '/admin/creators', 'id' => 'admin-creators'],
                        ['type' => 'route', 'label' => 'Livechat', 'action' => '/admin/settings/livechat', 'id' => 'fufr42'],
                        ['type' => 'route', 'label' => 'Roles', 'action' => '/admin/roles', 'id' => 'roles'],
                        ['type' => 'route', 'label' => 'AI Agent', 'action' => '/admin/settings/ai', 'id' => 'fzvw42'],
                        ['type' => 'route', 'label' => 'Withdrawals', 'action' => '/admin/withdrawals', 'id' => 'admin-withdrawals'],
                    ],
                ],
                [
                    'name' => 'Agent',
                    'id' => 'agent-dashboard-sidebar',
                    'positions' => ['dashboard-sidebar'],
                    'items' => [
                        ['type' => 'route', 'label' => 'AI Agent', 'action' => '/agent/ai-agent/settings', 'id' => 'agent-nav-ai-agents'],
                    ],
                ],
            ]),
            'private' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ],
    );
}

test('livechat and ai agent leave the admin sidebar and stay inside settings', function () {
    seedAdminSidebarWithSupportShortcuts();

    runLivechatAiAgentMenuMigration()->up();

    $menus = json_decode(DB::table('settings')->where('name', 'menus')->value('value'), true);
    $admin = collect($menus)->firstWhere('positions.0', 'admin-sidebar');
    $agent = collect($menus)->firstWhere('id', 'agent-dashboard-sidebar');

    expect(collect($admin['items'])->pluck('action')->all())->toBe([
        '/admin/settings',
        '/admin/creators',
        '/admin/roles',
        '/admin/withdrawals',
    ]);
    expect(collect($agent['items'])->pluck('action')->all())->toContain('/agent/ai-agent/settings');
});
