<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $settings = [
            ['name' => 'billing.currency', 'value' => 'ETB'],
            ['name' => 'billing.currency_symbol', 'value' => 'Br'],
            ['name' => 'billing.currency_symbol_position', 'value' => 'after'],
        ];

        foreach ($settings as $setting) {
            $exists = DB::table('settings')
                ->where('name', $setting['name'])
                ->exists();
            if (!$exists) {
                DB::table('settings')->insert([
                    'name' => $setting['name'],
                    'value' => $setting['value'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        DB::table('settings')
            ->whereIn('name', [
                'billing.currency',
                'billing.currency_symbol',
                'billing.currency_symbol_position',
            ])
            ->delete();
    }
};
