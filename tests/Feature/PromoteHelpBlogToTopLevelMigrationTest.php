<?php

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;

uses(DatabaseTransactions::class);

/**
 * Help center and Blog are top-level admin pages, not Settings tabs
 * (user ruling 2026-10-13). This migration rewrites the sidebar actions
 * that earlier migrations / defaults inserted as /admin/settings/*.
 */
function runPromoteHelpBlogMigration(): object
{
    return require glob(
        database_path('migrations/*_promote_help_blog_to_top_level.php'),
    )[0];
}

function seedPromoteSidebarMenus(array $items): void
{
    $menus = [
        [
            'name' => 'Admin Sidebar',
            'id' => 'a07',
            'positions' => ['admin-sidebar'],
            'items' => $items,
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

function promoteStoredActions(): array
{
    $menus = json_decode(
        DB::table('settings')->where('name', 'menus')->value('value'),
        true,
    );

    return collect($menus)->firstWhere('positions.0', 'admin-sidebar')['items']
        ?? [];
}

test('migration rewrites nested help and blog actions to top-level routes', function () {
    seedPromoteSidebarMenus([
        ['type' => 'route', 'label' => 'Settings', 'action' => '/admin/settings', 'permissions' => ['settings.update'], 'order' => 0],
        ['type' => 'route', 'label' => 'Help center', 'action' => '/admin/settings/help', 'permissions' => ['settings.update'], 'order' => 1],
        ['type' => 'route', 'label' => 'Blog', 'action' => '/admin/settings/blog', 'permissions' => ['settings.update'], 'order' => 2],
        ['type' => 'route', 'label' => 'Logs', 'action' => '/admin/logs', 'order' => 3],
    ]);

    runPromoteHelpBlogMigration()->up();

    $actions = collect(promoteStoredActions())->pluck('action')->all();

    expect($actions)->toContain('/admin/help');
    expect($actions)->toContain('/admin/blog');
    expect($actions)->not->toContain('/admin/settings/help');
    expect($actions)->not->toContain('/admin/settings/blog');

    // help stays directly after Settings, blog directly after help
    expect(array_search('/admin/help', $actions))
        ->toBe(array_search('/admin/settings', $actions) + 1);
    expect(array_search('/admin/blog', $actions))
        ->toBe(array_search('/admin/help', $actions) + 1);

    // orders stay sequential
    expect(collect(promoteStoredActions())->pluck('order')->all())
        ->toBe(range(0, count($actions) - 1));

    // label/type/permissions are preserved, not recreated
    $help = collect(promoteStoredActions())->firstWhere('action', '/admin/help');
    expect($help['label'])->toBe('Help center');
    expect($help['type'])->toBe('route');
    expect($help['permissions'])->toBe(['settings.update']);
});

test('migration is idempotent and dedupes when the new path already exists', function () {
    seedPromoteSidebarMenus([
        ['type' => 'route', 'label' => 'Settings', 'action' => '/admin/settings', 'order' => 0],
        ['type' => 'route', 'label' => 'Help center', 'action' => '/admin/help', 'order' => 1],
        ['type' => 'route', 'label' => 'Help center', 'action' => '/admin/settings/help', 'order' => 2],
        ['type' => 'route', 'label' => 'Blog', 'action' => '/admin/settings/blog', 'order' => 3],
    ]);

    $migration = runPromoteHelpBlogMigration();
    $migration->up();
    $migration->up();

    $items = promoteStoredActions();
    $actions = collect($items)->pluck('action')->all();

    expect($actions)->toContain('/admin/help');
    expect($actions)->toContain('/admin/blog');
    expect(collect($items)->where('action', '/admin/help')->count())->toBe(1);
    expect($actions)->not->toContain('/admin/settings/help');
    expect(collect($items)->pluck('order')->all())
        ->toBe(range(0, count($actions) - 1));
});

test('migration down restores the nested settings paths', function () {
    seedPromoteSidebarMenus([
        ['type' => 'route', 'label' => 'Settings', 'action' => '/admin/settings', 'order' => 0],
        ['type' => 'route', 'label' => 'Help center', 'action' => '/admin/settings/help', 'order' => 1],
        ['type' => 'route', 'label' => 'Blog', 'action' => '/admin/settings/blog', 'order' => 2],
    ]);

    $migration = runPromoteHelpBlogMigration();
    $migration->up();
    $migration->down();

    $actions = collect(promoteStoredActions())->pluck('action')->all();

    expect($actions)->toContain('/admin/settings/help');
    expect($actions)->toContain('/admin/settings/blog');
    expect($actions)->not->toContain('/admin/help');
    expect($actions)->not->toContain('/admin/blog');
});

test('migration is a no-op without an admin sidebar menu', function () {
    DB::table('settings')->updateOrInsert(
        ['name' => 'menus'],
        ['value' => json_encode([]), 'private' => false, 'created_at' => now(), 'updated_at' => now()],
    );

    runPromoteHelpBlogMigration()->up();

    expect(promoteStoredActions())->toBe([]);
});

test('defaults ship top-level help and blog actions', function () {
    $defaults = (new \Common\Settings\LoadDefaultSettings())->execute();
    $menus = json_decode(
        collect($defaults)->firstWhere('name', 'menus')['value'],
        true,
    );

    $admin = collect($menus)->firstWhere('positions.0', 'admin-sidebar');
    $actions = collect($admin['items'])->pluck('action')->all();

    expect($actions)->toContain('/admin/help');
    expect($actions)->toContain('/admin/blog');
    expect($actions)->not->toContain('/admin/settings/help');
    expect($actions)->not->toContain('/admin/settings/blog');
});
