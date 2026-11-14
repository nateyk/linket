<?php

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;

uses(DatabaseTransactions::class);

function seedLegacyHelpCenterMenu(): void
{
    DB::table('settings')->updateOrInsert(
        ['name' => 'menus'],
        [
            'value' => json_encode([[
                'name' => 'Admin Sidebar',
                'positions' => ['admin-sidebar'],
                'items' => [
                    ['id' => 'settings', 'label' => 'Settings', 'action' => '/admin/settings', 'order' => 0],
                    ['id' => 'admin-help-center', 'label' => 'Help center', 'action' => '/admin/settings/hc', 'permissions' => ['settings.update'], 'order' => 1],
                    ['id' => 'old-help-center', 'label' => 'Help center', 'action' => '/admin/settings/help', 'permissions' => ['settings.update'], 'order' => 2],
                    ['id' => 'blog', 'label' => 'Blog', 'action' => '/admin/blog', 'order' => 3],
                ],
            ]]),
            'private' => false,
            'updated_at' => now(),
            'created_at' => now(),
        ],
    );
}

function canonicalHelpCenterMigration()
{
    return require database_path('migrations/2026_11_14_144400_canonicalize_help_center_admin_sidebar.php');
}

test('legacy admin sidebar uses a single permission-safe Help Center content link', function () {
    seedLegacyHelpCenterMenu();

    $migration = canonicalHelpCenterMigration();
    $migration->up();
    $migration->up();

    $menus = json_decode(DB::table('settings')->where('name', 'menus')->value('value'), true);
    $items = $menus[0]['items'];
    $help = collect($items)->where('action', '/admin/help');

    expect($help)->toHaveCount(1);
    expect($help->first()['permissions'])->toBe(['articles.update']);
    expect(collect($items)->pluck('action')->all())->toBe([
        '/admin/settings',
        '/admin/help',
        '/admin/blog',
    ]);
    expect(collect($items)->pluck('order')->all())->toBe([0, 1, 2]);
});
