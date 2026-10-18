<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const ACTION = '/dashboard/services';

    private const AFTER = '/dashboard/items';

    private const MENUS = [
        'dashboard-primary' => 'creator-services-dashboard',
        'dashboard-mobile' => 'creator-services-mobile',
    ];

    public function up(): void
    {
        $this->mutateMenus(function (array $items, string $id): array {
            if ($this->indexOf($items, self::ACTION) !== null) {
                return $items;
            }

            $item = [
                'type' => 'route',
                'label' => 'My Services',
                'action' => self::ACTION,
                'id' => $id,
            ];

            $afterIndex = $this->indexOf($items, self::AFTER);
            if ($afterIndex === null) {
                $items[] = $item;
            } else {
                array_splice($items, $afterIndex + 1, 0, [$item]);
            }

            return $items;
        });
    }

    public function down(): void
    {
        $this->mutateMenus(
            fn (array $items): array => array_values(
                array_filter(
                    $items,
                    fn (array $item): bool => ($item['action'] ?? null) !== self::ACTION,
                ),
            ),
        );
    }

    /**
     * @param  callable(array<int, array>, string): array<int, array>  $mutate
     */
    private function mutateMenus(callable $mutate): void
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
            $position = collect(array_keys(self::MENUS))->first(
                fn (string $position): bool => in_array($position, $positions, true),
            );

            if (!$position) {
                continue;
            }

            $items = array_values($menu['items'] ?? []);
            $mutated = array_values($mutate($items, self::MENUS[$position]));

            if ($mutated === $items) {
                continue;
            }

            foreach ($mutated as $index => &$item) {
                $item['order'] = $index;
            }
            unset($item);

            $menu['items'] = $mutated;
            $changed = true;
        }
        unset($menu);

        if ($changed) {
            DB::table('settings')
                ->where('name', 'menus')
                ->update(['value' => json_encode($menus)]);

            Cache::forget('settings.public');
        }
    }

    /**
     * @param  array<int, array>  $items
     */
    private function indexOf(array $items, string $action): int|null
    {
        foreach ($items as $index => $item) {
            if (($item['action'] ?? null) === $action) {
                return $index;
            }
        }

        return null;
    }
};
