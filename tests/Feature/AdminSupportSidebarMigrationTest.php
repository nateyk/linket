<?php

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;

uses(DatabaseTransactions::class);

function supportAdminMenu(): array
{
    return [
        [
            'id' => 'admin-menu',
            'name' => 'Admin Sidebar',
            'positions' => ['admin-sidebar'],
            'items' => [
                ['id' => 'insights', 'type' => 'route', 'label' => 'Insights', 'action' => '/admin/insights', 'order' => 0],
                ['id' => 'admin-help-center', 'type' => 'route', 'label' => 'Help center', 'action' => '/admin/help', 'order' => 1],
                ['id' => 'blog', 'type' => 'route', 'label' => 'Blog', 'action' => '/admin/blog', 'order' => 2],
            ],
        ],
        [
            'id' => 'agent-sidebar',
            'name' => 'Agent Sidebar',
            'positions' => ['dashboard-sidebar'],
            'items' => [
                ['id' => 'agent-nav-conversations', 'action' => '/agent/conversations?viewId=mine', 'type' => 'route', 'order' => 0],
            ],
        ],
    ];
}

test('support menu is inserted only once and leaves agent navigation unchanged', function () {
    DB::table('settings')->updateOrInsert(
        ['name' => 'menus'],
        ['value' => json_encode(supportAdminMenu()), 'updated_at' => now(), 'created_at' => now()],
    );
    $migration = require database_path('migrations/2026_11_15_211500_add_admin_support_management_menu.php');

    $migration->up();
    $migration->up();

    $menus = json_decode(DB::table('settings')->where('name', 'menus')->value('value'), true);
    $admin = $menus[0]['items'];
    expect(array_column($admin, 'action'))->toBe([
        '/admin/insights', '/admin/support', '/admin/help', '/admin/blog',
    ]);
    expect($admin[1]['permissions'])->toBe(['admin.access']);
    expect(array_column($admin, 'order'))->toBe([0, 1, 2, 3]);
    expect($menus[1]['items'])->toBe(supportAdminMenu()[1]['items']);
});

test('existing support menu entries are not duplicated or modified', function () {
    $menus = supportAdminMenu();
    $menus[0]['items'][] = [
        'id' => 'custom-support',
        'type' => 'route',
        'label' => 'My support',
        'action' => '/admin/support',
        'order' => 3,
    ];
    DB::table('settings')->updateOrInsert(
        ['name' => 'menus'],
        ['value' => json_encode($menus), 'updated_at' => now(), 'created_at' => now()],
    );

    $migration = require database_path('migrations/2026_11_15_211500_add_admin_support_management_menu.php');
    $migration->up();

    $after = json_decode(DB::table('settings')->where('name', 'menus')->value('value'), true);
    expect($after)->toBe($menus);
});
