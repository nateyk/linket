<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const ACTION = '/admin/service-categories';

    private const AFTER = '/admin/blog';

    public function up(): void
    {
        $this->mutateAdminSidebar(function (array $items): array {
            $alreadyPresent = collect($items)->contains(
                fn (array $item): bool => ($item['action'] ?? null) === self::ACTION,
            );

            if ($alreadyPresent) {
                return $items;
            }

            $item = [
                'label' => 'Service categories',
                'id' => 'admin-service-categories',
                'action' => self::ACTION,
                'type' => 'route',
                'permissions' => ['settings.update'],
            ];

            $afterIndex = collect($items)->search(
                fn (array $item): bool => ($item['action'] ?? null) === self::AFTER,
            );

            if ($afterIndex === false) {
                $items[] = $item;
            } else {
                array_splice($items, $afterIndex + 1, 0, [$item]);
            }

            return $items;
        });
    }

    public function down(): void
    {
        $this->mutateAdminSidebar(
            fn (array $items): array => array_values(
                array_filter(
                    $items,
                    fn (array $item): bool => ($item['action'] ?? null) !== self::ACTION,
                ),
            ),
        );
    }

    /**
     * @param  callable(array<int, array>): array<int, array>  $mutate
     */
    private function mutateAdminSidebar(callable $mutate): void
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
            if (!in_array('admin-sidebar', $menu['positions'] ?? [], true)) {
                continue;
            }

            $items = array_values($menu['items'] ?? []);
            $mutated = array_values($mutate($items));

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
};
