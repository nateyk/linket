<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Align current plan benefits with the approved model: new sales carry 0% commission.
     * Historical orders and commission invoices retain their snapshotted values.
     */
    public function up(): void
    {
        foreach (DB::table('products')->whereIn('name', ['Free', 'Pro'])->get() as $plan) {
            $benefits = json_decode($plan->storefront_benefits ?? '{}', true) ?: [];
            $benefits['commission_bps'] = 0;
            $benefits['platform_fee_percent'] = 0.0;
            DB::table('products')->where('id', $plan->id)->update([
                'storefront_benefits' => json_encode($benefits),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        // Historical plan values cannot be restored reliably; this migration is additive.
    }
};
