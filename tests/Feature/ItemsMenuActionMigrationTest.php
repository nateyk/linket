<?php

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

uses(DatabaseTransactions::class);

function runItemsMenuActionMigration(): object
{
    return require glob(
        database_path('migrations/*_fix_items_menu_actions.php'),
    )[0];
}

function seedLegacyItemsMenuRows(): void
{
    $menus = [
        [
            'name' => 'Dashboard primary',
            'id' => 'a01',
            'positions' => ['dashboard-primary'],
            'items' => [
                ['type' => 'route', 'label' => 'Home', 'action' => '/dashboard', 'id' => 'dashboard-home'],
                ['type' => 'route', 'label' => 'My Products', 'action' => '/dashboard/my-products', 'id' => 'digital-products-dashboard'],
            ],
        ],
        [
            'name' => 'Dashboard mobile',
            'id' => 'a03',
            'positions' => ['dashboard-mobile'],
            'items' => [
                ['type' => 'route', 'label' => 'Home', 'action' => '/dashboard', 'id' => 'dashboard-home-mobile'],
                ['type' => 'route', 'label' => 'My Products', 'action' => '/dashboard/my-products', 'id' => 'digital-products-mobile'],
            ],
        ],
        [
            'name' => 'Custom menu',
            'id' => 'user-custom-menu',
            'positions' => ['custom-sidebar'],
            'items' => [
                ['type' => 'route', 'label' => 'Products', 'action' => '/dashboard/my-products', 'id' => 'user-custom-products'],
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

function storedItemsMenuActions(): array
{
    $menus = json_decode(
        DB::table('settings')->where('name', 'menus')->value('value'),
        true,
    );

    return collect($menus)
        ->flatMap(fn ($menu) => collect($menu['items'] ?? [])->pluck('action'))
        ->all();
}

function itemsMenuByPosition(string $position): ?array
{
    $menus = json_decode(
        DB::table('settings')->where('name', 'menus')->value('value'),
        true,
    );

    return collect($menus)->firstWhere('positions.0', $position);
}

test('menu migration rewrites my-products actions to items across desktop, mobile and custom menus', function () {
    seedLegacyItemsMenuRows();

    runItemsMenuActionMigration()->up();

    $actions = storedItemsMenuActions();
    expect($actions)->not->toContain('/dashboard/my-products');
    expect($actions)->toContain('/dashboard/items');

    // untouched items survive the rewrite
    expect($actions)->toContain('/dashboard');

    // desktop and mobile menus each carry the new items action
    $desktop = collect(itemsMenuByPosition('dashboard-primary')['items'])->pluck('action');
    $mobile = collect(itemsMenuByPosition('dashboard-mobile')['items'])->pluck('action');
    expect($desktop)->toContain('/dashboard/items');
    expect($mobile)->toContain('/dashboard/items');

    // the user-created custom menu is rewritten too
    $custom = collect(itemsMenuByPosition('custom-sidebar')['items'])->pluck('action');
    expect($custom)->toContain('/dashboard/items');
    expect($custom)->not->toContain('/dashboard/my-products');
});

test('menu migration down restores my-products actions symmetrically', function () {
    seedLegacyItemsMenuRows();
    $migration = runItemsMenuActionMigration();

    $migration->up();
    $migration->down();

    $actions = storedItemsMenuActions();
    expect($actions)->toContain('/dashboard/my-products');
    expect($actions)->not->toContain('/dashboard/items');
});

test('menu migration is a no-op when the menus setting row is absent', function () {
    DB::table('settings')->where('name', 'menus')->delete();

    runItemsMenuActionMigration()->up();

    expect(DB::table('settings')->where('name', 'menus')->exists())->toBeFalse();
});

test('menu migration purges the stale settings.public cache', function () {
    seedLegacyItemsMenuRows();

    // Simulate a warm 24h cache holding the pre-migration menus blob
    // (Settings::loadSettings caches the whole settings table under this key).
    $stale = collect(
        DB::table('settings')->pluck('value', 'name'),
    );
    $staleMenus = collect(
        json_decode($stale->get('menus'), true),
    )->flatMap(fn ($menu) => collect($menu['items'] ?? [])->pluck('action'));
    expect($staleMenus->all())->toContain('/dashboard/my-products');
    Cache::set('settings.public', $stale, now()->addDay());

    runItemsMenuActionMigration()->up();

    $fresh = Cache::get('settings.public');
    expect($fresh)->toBeNull();
});

test('default menu seeding points desktop and mobile menus at /dashboard/items', function () {
    DB::table('settings')->where('name', 'menus')->delete();

    (new \Database\Seeders\CreateDefaultMenusSeeder())->run();

    $actions = storedItemsMenuActions();
    expect($actions)->toContain('/dashboard/items');
    expect($actions)->not->toContain('/dashboard/my-products');

    $desktop = collect(itemsMenuByPosition('dashboard-primary')['items'])->pluck('action');
    $mobile = collect(itemsMenuByPosition('dashboard-mobile')['items'])->pluck('action');
    expect($desktop)->toContain('/dashboard/items');
    expect($mobile)->toContain('/dashboard/items');
});
