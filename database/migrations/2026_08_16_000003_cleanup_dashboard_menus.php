<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
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
            $positions = $menu['positions'] ?? [];
            $items = $menu['items'] ?? [];
            if (!is_array($items)) {
                continue;
            }

            if (in_array('dashboard-primary', $positions)) {
                $actions = array_map(
                    fn ($item) => str_replace('\\/', '/', $item['action'] ?? ''),
                    $items,
                );

                foreach (
                    [
                        ['action' => '/dashboard/insights', 'label' => 'Insights', 'id' => 318],
                        ['action' => '/dashboard/pixels', 'label' => 'Tracking pixels', 'id' => 303],
                    ] as $desired
                ) {
                    if (!in_array($desired['action'], $actions)) {
                        $items[] = [
                            'type' => 'route',
                            'label' => $desired['label'],
                            'action' => $desired['action'],
                            'id' => $desired['id'],
                        ];
                        $actions[] = $desired['action'];
                        $changed = true;
                    }
                }

                $menu['items'] = $items;
            }

            if (in_array('dashboard-secondary', $positions)) {
                $filtered = array_values(array_filter(
                    $items,
                    fn ($item) => !in_array(
                        str_replace('\\/', '/', $item['action'] ?? ''),
                        ['/dashboard/insights', '/dashboard/pixels'],
                    ),
                ));

                if (count($filtered) !== count($items)) {
                    $menu['items'] = $filtered;
                    $changed = true;
                }
            }
        }
        unset($menu);

        if ($changed) {
            DB::table('settings')
                ->where('name', 'menus')
                ->update(['value' => json_encode($menus)]);
        }
    }

    public function down(): void
    {
        // Irreversible — menu restructuring is not supported
    }
};