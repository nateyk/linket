<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        $this->updateDashboardMenu(function (array $items): array {
            return array_values(array_filter(
                $items,
                fn (array $item): bool => ($item['action'] ?? null) !== '/dashboard/commerce',
            ));
        });
    }

    public function down(): void
    {
        $this->updateDashboardMenu(function (array $items): array {
            if (collect($items)->contains(
                fn (array $item): bool => ($item['action'] ?? null) === '/dashboard/commerce',
            )) {
                return $items;
            }

            $commerce = [
                'type' => 'route',
                'label' => 'Commerce',
                'action' => '/dashboard/commerce',
                'id' => 'commerce-dashboard',
            ];
            $insertAt = collect($items)->search(
                fn (array $item): bool => ($item['action'] ?? null) === '/dashboard/sales-payouts',
            );

            if ($insertAt === false) {
                $items[] = $commerce;
            } else {
                array_splice($items, $insertAt + 1, 0, [$commerce]);
            }

            return $items;
        });
    }

    private function updateDashboardMenu(callable $update): void
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
            if (!in_array('dashboard-primary', $menu['positions'] ?? [], true)) {
                continue;
            }

            $items = $menu['items'] ?? [];
            if (!is_array($items)) {
                continue;
            }

            $updated = $update($items);
            if ($updated !== $items) {
                $menu['items'] = $updated;
                $changed = true;
            }
        }
        unset($menu);

        if ($changed) {
            DB::table('settings')
                ->where('name', 'menus')
                ->update(['value' => json_encode($menus)]);
        }
    }
};
