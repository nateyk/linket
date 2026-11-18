<?php

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

uses(DatabaseTransactions::class);

beforeEach(function () {
    if (! Schema::hasTable('settings')) {
        Schema::create('settings', function ($table) {
            $table->id();
            $table->string('name')->unique();
            $table->text('value')->nullable();
            $table->timestamps();
        });
    }
});

function sampleAdminMenuWithScatteredFinancialItems(): array
{
    return [
        [
            'id' => 'admin-menu',
            'name' => 'Admin Sidebar',
            'positions' => ['admin-sidebar'],
            'items' => [
                ['id' => 'insights', 'type' => 'route', 'label' => 'Insights', 'action' => '/admin/insights', 'order' => 0],
                ['id' => 'settings', 'type' => 'route', 'label' => 'Settings', 'action' => '/admin/settings', 'order' => 1],
                ['id' => 'digital-products-admin', 'type' => 'route', 'label' => 'Items', 'action' => '/admin/items', 'order' => 2],
                ['id' => 'admin-withdrawals', 'type' => 'route', 'label' => 'Withdrawals', 'action' => '/admin/withdrawals', 'order' => 3],
                ['id' => 'admin-payment-activity', 'type' => 'route', 'label' => 'Payment Activity', 'action' => '/admin/payment-activity', 'order' => 4],
                ['id' => 'admin-kyc-verifications', 'type' => 'route', 'label' => 'KYC Verifications', 'action' => '/admin/kyc-verifications', 'order' => 5],
                ['id' => 'admin-payment-gateways', 'type' => 'route', 'label' => 'Payment Gateways', 'action' => '/admin/financial/payment-gateways', 'order' => 6],
                ['id' => 'admin-withdrawal-methods', 'type' => 'route', 'label' => 'Receiving accounts', 'action' => '/admin/financial/withdrawal-methods', 'order' => 7],
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

test('consolidates scattered financial items into a single financial hub entry', function () {
    DB::table('settings')->updateOrInsert(
        ['name' => 'menus'],
        ['value' => json_encode(sampleAdminMenuWithScatteredFinancialItems()), 'updated_at' => now(), 'created_at' => now()],
    );

    $migration = require database_path('migrations/2026_11_15_220000_consolidate_financial_menu_in_admin_sidebar.php');

    $migration->up();
    // Idempotent: running again must not change anything
    $migration->up();

    $menus = json_decode(DB::table('settings')->where('name', 'menus')->value('value'), true);
    $admin = $menus[0]['items'];

    expect(array_column($admin, 'action'))->toBe([
        '/admin/insights',
        '/admin/settings',
        '/admin/items',
        '/admin/financial',
        '/admin/kyc-verifications',
    ]);

    $financial = collect($admin)->firstWhere('action', '/admin/financial');
    expect($financial)->not->toBeNull();
    expect($financial['label'])->toBe('Financial');
    expect($financial['id'])->toBe('admin-financial');
    expect($financial['permissions'])->toBe(['admin.access']);

    // Orders must be contiguous 0..n
    expect(array_column($admin, 'order'))->toBe([0, 1, 2, 3, 4]);

    // Unrelated menus must remain untouched
    expect($menus[1]['items'])->toBe(sampleAdminMenuWithScatteredFinancialItems()[1]['items']);
});

test('does not duplicate financial menu if already present', function () {
    $menus = sampleAdminMenuWithScatteredFinancialItems();
    $menus[0]['items'][] = [
        'id' => 'admin-financial',
        'type' => 'route',
        'label' => 'Financial',
        'action' => '/admin/financial',
        'order' => 8,
    ];

    DB::table('settings')->updateOrInsert(
        ['name' => 'menus'],
        ['value' => json_encode($menus), 'updated_at' => now(), 'created_at' => now()],
    );

    $migration = require database_path('migrations/2026_11_15_220000_consolidate_financial_menu_in_admin_sidebar.php');
    $migration->up();

    $saved = json_decode(DB::table('settings')->where('name', 'menus')->value('value'), true);
    $admin = $saved[0]['items'];

    $financialCount = collect($admin)->where('action', '/admin/financial')->count();
    expect($financialCount)->toBe(1);
});
