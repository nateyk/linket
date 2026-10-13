<?php

use Common\Settings\LoadDefaultSettings;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;

uses(DatabaseTransactions::class);

/**
 * Blog management exists at /admin/settings/blog but was not linked from any
 * nav. This migration adds it to the Admin Sidebar, right after "Help center".
 */
function runBlogSidebarMigration(): object
{
    return require glob(
        database_path('migrations/*_add_blog_to_admin_sidebar.php'),
    )[0];
}

function seedAdminSidebarMenusForBlogTest(): void
{
    $menus = [
        [
            'name' => 'Admin Sidebar',
            'id' => 'a07',
            'positions' => ['admin-sidebar'],
            'items' => [
                ['type' => 'route', 'label' => 'Settings', 'action' => '/admin/settings', 'permissions' => ['settings.update'], 'order' => 0],
                ['type' => 'route', 'label' => 'Help center', 'action' => '/admin/settings/help', 'permissions' => ['settings.update'], 'order' => 1],
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

function storedBlogSidebarItems(): array
{
    $menus = json_decode(
        DB::table('settings')->where('name', 'menus')->value('value'),
        true,
    );

    return collect($menus)->firstWhere('positions.0', 'admin-sidebar')['items'] ?? [];
}

test('blog migration adds Blog directly after Help center with the settings permission', function () {
    seedAdminSidebarMenusForBlogTest();

    runBlogSidebarMigration()->up();

    $items = storedBlogSidebarItems();
    $actions = collect($items)->pluck('action')->all();

    expect($actions)->toContain('/admin/settings/blog');
    expect(array_search('/admin/settings/blog', $actions))
        ->toBe(array_search('/admin/settings/help', $actions) + 1);

    $blog = collect($items)->firstWhere('action', '/admin/settings/blog');
    expect($blog['permissions'])->toBe(['settings.update']);
    expect(collect($items)->pluck('order')->all())->toBe(range(0, count($items) - 1));
});

test('blog migration is idempotent', function () {
    seedAdminSidebarMenusForBlogTest();
    $migration = runBlogSidebarMigration();

    $migration->up();
    $migration->up();

    expect(collect(storedBlogSidebarItems())->where('action', '/admin/settings/blog')->count())
        ->toBe(1);
});

test('blog migration down removes only the Blog entry', function () {
    seedAdminSidebarMenusForBlogTest();
    $migration = runBlogSidebarMigration();

    $migration->up();
    $migration->down();

    $actions = collect(storedBlogSidebarItems())->pluck('action')->all();
    expect($actions)->not->toContain('/admin/settings/blog');
    expect($actions)->toContain('/admin/settings/help');
});

test('fresh installs ship the Blog admin sidebar entry', function () {
    $defaults = (new LoadDefaultSettings())->execute();
    $menus = json_decode(
        collect($defaults)->firstWhere('name', 'menus')['value'],
        true,
    );

    $admin = collect($menus)->firstWhere('positions.0', 'admin-sidebar');
    $actions = collect($admin['items'])->pluck('action')->all();

    expect($actions)->toContain('/admin/settings/blog');
    expect(array_search('/admin/settings/blog', $actions))
        ->toBe(array_search('/admin/settings/help', $actions) + 1);
});
