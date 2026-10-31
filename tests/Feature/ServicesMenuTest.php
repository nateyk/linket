<?php

namespace Tests\Feature;

use Common\Settings\LoadDefaultSettings;
use Tests\TestCase;

class ServicesMenuTest extends TestCase
{
    public function test_my_services_item_is_added_to_dashboard_menus(): void
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
            $item = $items->firstWhere('action', '/dashboard/services');

            $this->assertNotNull($item, "Missing My Services item in {$position}");
            $this->assertSame('My Services', $item['label']);

            $actions = $items->pluck('action')->values();
            $itemsIndex = $actions->search('/dashboard/items');
            $servicesIndex = $actions->search('/dashboard/services');

            $this->assertNotFalse($itemsIndex);
            $this->assertGreaterThan($itemsIndex, $servicesIndex);
        }
    }
}
