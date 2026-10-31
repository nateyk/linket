<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $this->relabel('Receiving accounts');
    }

    public function down(): void
    {
        $this->relabel('Creator Withdrawals (legacy)');
    }

    private function relabel(string $label): void
    {
        $setting = DB::table('settings')->where('name', 'menus')->first();
        if (! $setting) {
            return;
        }

        $menus = json_decode($setting->value, true);
        if (! is_array($menus)) {
            return;
        }

        foreach ($menus as &$menu) {
            if (! in_array('admin-sidebar', $menu['positions'] ?? [], true)) {
                continue;
            }
            foreach ($menu['items'] as &$item) {
                if (($item['id'] ?? null) === 'admin-withdrawal-methods' || ($item['action'] ?? null) === '/admin/financial/withdrawal-methods') {
                    $item['label'] = $label;
                }
            }
            unset($item);
        }
        unset($menu);

        DB::table('settings')->where('name', 'menus')->update([
            'value' => json_encode($menus),
        ]);
        Cache::forget('settings.public');
    }
};
