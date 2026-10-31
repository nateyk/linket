<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        $this->updateDashboardMenu('/dashboard/orders', 'Orders & Sales');
    }

    public function down(): void
    {
        $this->updateDashboardMenu('/dashboard/sales-payouts', 'Sales & Payouts');
    }

    private function updateDashboardMenu(string $action, string $label): void
    {
        $setting = DB::table('settings')->where('name', 'menus')->first();
        if (!$setting) {
            return;
        }

        $menus = json_decode($setting->value, true);
        if (!is_array($menus)) {
            return;
        }

        $changed = false;

        foreach ($menus as &$menu) {
            $items = $menu['items'] ?? [];
            if (!is_array($items)) {
                continue;
            }

            foreach ($items as &$item) {
                $itemAction = $item['action'] ?? null;
                if (!in_array($itemAction, ['/dashboard/sales-payouts', '/dashboard/sales-payments', '/dashboard/orders'], true)) {
                    continue;
                }

                if ($itemAction !== $action || ($item['label'] ?? null) !== $label) {
                    $item['action'] = $action;
                    $item['label'] = $label;
                    $changed = true;
                }
            }
            unset($item);

            $menu['items'] = array_values($items);
        }
        unset($menu);

        if ($changed) {
            DB::table('settings')
                ->where('name', 'menus')
                ->update(['value' => json_encode($menus)]);
        }
    }
};
