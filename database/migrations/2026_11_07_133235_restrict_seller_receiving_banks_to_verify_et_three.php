<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $allowed = ['cbe', 'telebirr', 'boa'];
        DB::table('direct_payment_method_catalog')->whereIn('code', $allowed)->update([
            'creator_setup_enabled' => true,
            'checkout_enabled' => true,
            'operationally_suspended' => false,
            'updated_at' => now(),
        ]);
        DB::table('direct_payment_method_catalog')->whereNotIn('code', $allowed)->update([
            'creator_setup_enabled' => false,
            'checkout_enabled' => false,
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('direct_payment_method_catalog')->update([
            'creator_setup_enabled' => true,
            'checkout_enabled' => true,
            'updated_at' => now(),
        ]);
    }
};
