<?php

namespace Tests\Feature;

use Common\Settings\LoadDefaultSettings;
use Tests\TestCase;

class CreatorWithdrawalsMenuTest extends TestCase
{
    public function test_withdrawals_item_is_added_to_dashboard_menus(): void
    {
        $menus = json_decode(
            collect(app(LoadDefaultSettings::class)->execute())->firstWhere('name', 'menus')['value'],
            true,
        );
        $this->assertIsArray($menus);

        foreach (['dashboard-primary', 'dashboard-mobile'] as $position) {
            $menu = collect($menus)->first(
                fn (array $menu): bool => in_array($position, $menu['positions'] ?? [], true),
            );
            $this->assertNotNull($menu, "Missing {$position} menu");

            $items = collect($menu['items'] ?? []);
            $item = $items->firstWhere('action', '/dashboard/withdrawals');

            $this->assertNotNull($item, "Missing Withdrawals item in {$position}");
            $this->assertSame('Withdrawals', $item['label']);

            $actions = $items->pluck('action')->values();
            $ordersIndex = $actions->search('/dashboard/orders');
            $withdrawalsIndex = $actions->search('/dashboard/withdrawals');

            $this->assertNotFalse($ordersIndex);
            $this->assertGreaterThan($ordersIndex, $withdrawalsIndex);
        }
    }
}
