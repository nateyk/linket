<?php

use Common\Settings\LoadDefaultSettings;
use Common\Settings\Models\Setting;
use Illuminate\Database\Migrations\Migration;
use Sentry\Util\Arr;

return new class extends Migration {
    public function up(): void
    {
        $menuPositions = [
            'dashboard-primary',
            'dashboard-secondary',
            'dashboard-mobile',
        ];

        $setting = Setting::where('name', 'menus')->first();

        if (!$setting) {
            return;
        }

        $menus = $setting->value;

        $existingPositions = collect($menus)->pluck('positions')->flatten();

        $defaultSettings = (new LoadDefaultSettings())->execute();

        $menusConfig = collect($defaultSettings)
            ->filter(fn($setting) => $setting['name'] === 'menus')
            ->first()['value'];
        $menusConfig = json_decode($menusConfig, true);

        $newMenus = array_filter(
            $menusConfig,
            fn($menu) => array_intersect($menu['positions'], $menuPositions),
        );

        foreach ($newMenus as $menu) {
            if (!$existingPositions->contains($menu['positions'][0])) {
                $menus[] = $menu;
            }
        }

        Setting::where('name', 'menus')->update([
            'value' => json_encode($menus),
        ]);
    }
};
