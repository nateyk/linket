<?php

use Common\Settings\LoadDefaultSettings;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;

uses(DatabaseTransactions::class);

/**
 * The Help Center admin page exists at /admin/settings/help but was only
 * reachable as a tab inside Settings — admins reported they couldn't find it.
 * This migration adds it to the Admin Sidebar menu, right after "Settings".
 */
function runHelpCenterSidebarMigration(): object
{
    return require glob(
        database_path('migrations/*_add_help_center_to_admin_sidebar.php'),
    )[0];
}

function seedAdminSidebarMenusForHelpTest(?array $adminItems = null): void
{
    $menus = [
        [
            'name' => 'Dashboard primary',
            'id' => 'a01',
            'positions' => ['dashboard-primary'],
            'items' => [
                ['type' => 'route', 'label' => 'Home', 'action' => '/dashboard', 'id' => 'dashboard-home'],
            ],
        ],
        [
            'name' => 'Admin Sidebar',
            'id' => 'a07',
            'positions' => ['admin-sidebar'],
            'items' => $adminItems ?? [
                ['type' => 'route', 'label' => 'Insights', 'action' => '/admin/insights', 'order' => 0],
                ['type' => 'route', 'label' => 'Settings', 'action' => '/admin/settings', 'permissions' => ['settings.update'], 'order' => 1],
                ['type' => 'route', 'label' => 'Logs', 'action' => '/admin/logs', 'order' => 2],
            ],
        ],
    ];

    DB::table('settings')->updateOrInsert(
        ['name' => 'menus'],
        [
            'value' => json_encode($menus),
            'private' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ],
    );
}

function storedAdminSidebarItems(): array
{
    $menus = json_decode(
        DB::table('settings')->where('name', 'menus')->value('value'),
        true,
    );

    return collect($menus)->firstWhere('positions.0', 'admin-sidebar')['items'] ?? [];
}

function storedActions(): array
{
    return collect(storedAdminSidebarItems())->pluck('action')->all();
}

test('help center migration adds Help center directly after Settings with the settings permission', function () {
    seedAdminSidebarMenusForHelpTest();

    runHelpCenterSidebarMigration()->up();

    $items = storedAdminSidebarItems();
    $actions = collect($items)->pluck('action');

    expect($actions)->toContain('/admin/settings/help');

    // directly after Settings
    expect(array_search('/admin/settings/help', $actions->all()))
        ->toBe(array_search('/admin/settings', $actions->all()) + 1);

    $help = collect($items)->firstWhere('action', '/admin/settings/help');
    expect($help['permissions'])->toBe(['settings.update']);
    expect($help['type'])->toBe('route');

    // orders stay sequential so any order-aware consumer behaves
    expect(collect($items)->pluck('order')->all())->toBe(range(0, count($items) - 1));

    // untouched items survive
    expect($actions)->toContain('/admin/insights');
    expect($actions)->toContain('/admin/logs');
});

test('help center migration is idempotent', function () {
    seedAdminSidebarMenusForHelpTest();
    $migration = runHelpCenterSidebarMigration();

    $migration->up();
    $migration->up();

    expect(collect(storedActions())->filter(fn ($a) => $a === '/admin/settings/help')->count())
        ->toBe(1);
});

test('help center migration down removes only the Help center entry', function () {
    seedAdminSidebarMenusForHelpTest();
    $migration = runHelpCenterSidebarMigration();

    $migration->up();
    $migration->down();

    $actions = storedActions();
    expect($actions)->not->toContain('/admin/settings/help');
    expect($actions)->toContain('/admin/settings');
    expect($actions)->toContain('/admin/logs');
    expect(collect(storedAdminSidebarItems())->pluck('order')->all())
        ->toBe(range(0, count($actions) - 1));
});

test('help center migration is a no-op without an admin sidebar menu', function () {
    // menus row exists, but no admin-sidebar menu
    DB::table('settings')->updateOrInsert(
        ['name' => 'menus'],
        ['value' => json_encode([]), 'private' => false, 'created_at' => now(), 'updated_at' => now()],
    );

    runHelpCenterSidebarMigration()->up();

    expect(storedActions())->not->toContain('/admin/settings/help');
});

test('fresh installs ship the Help center settings sidebar entry', function () {
    $defaults = (new LoadDefaultSettings())->execute();
    $menus = json_decode(
        collect($defaults)->firstWhere('name', 'menus')['value'],
        true,
    );

    $admin = collect($menus)->firstWhere('positions.0', 'admin-sidebar');
    $actions = collect($admin['items'])->pluck('action');

    // Linket Common\Help was retired; support HC settings live under Settings.
    expect($actions)->toContain('/admin/settings/hc');
    expect($actions)->not->toContain('/admin/help');
    expect($actions)->not->toContain('/admin/settings/help');
    expect(array_search('/admin/settings/hc', $actions->all()))
        ->toBe(array_search('/admin/settings', $actions->all()) + 1);
});
