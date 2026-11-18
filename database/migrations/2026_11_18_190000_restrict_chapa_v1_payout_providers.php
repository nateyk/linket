<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('digital_product_withdrawal_methods')) {
            return;
        }

        // Keep all legacy rows for foreign keys, historical records and audits.
        // Disable destinations that cannot be selected for new Chapa v1 payouts.
        DB::table('digital_product_withdrawal_methods')
            ->whereNotIn('code', ['bank_transfer', 'cbebirr', 'mpesa', 'telebirr', 'yaya'])
            ->update(['is_active' => false, 'updated_at' => now()]);

        DB::table('digital_product_withdrawal_methods')
            ->where('code', 'bank_transfer')
            ->update([
                'name' => 'Commercial Bank of Ethiopia (CBE)',
                'destination_label' => 'CBE account number',
                'updated_at' => now(),
            ]);

        DB::table('digital_product_withdrawal_methods')
            ->where('code', 'yaya')
            ->update([
                'name' => 'YaYaWallet',
                'destination_label' => 'YaYaWallet number',
                'updated_at' => now(),
            ]);

        // Do not auto-enable Chapa wallet methods that an admin disabled.
        // Existing receiving accounts, payout requests and transfers remain untouched.
    }

    public function down(): void
    {
        // Intentionally irreversible: never silently re-enable retired payout providers.
    }
};
