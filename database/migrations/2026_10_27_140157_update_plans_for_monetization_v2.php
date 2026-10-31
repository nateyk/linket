<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        foreach (DB::table('products')->whereIn('name', ['Free', 'Pro'])->get() as $plan) {
            $benefits = json_decode($plan->storefront_benefits ?? '{}', true) ?: [];
            $bps = $plan->name === 'Free' ? 150 : 0;
            $benefits['commission_bps'] = $bps;
            $benefits['platform_fee_percent'] = $bps / 100;
            $benefits['max_products'] = $plan->name === 'Free' ? 5 : null;
            $benefits['max_upload_bytes'] = $plan->name === 'Free' ? 1073741824 : 26843545600;
            DB::table('products')->where('id', $plan->id)->update([
                'storefront_benefits' => json_encode($benefits),
                'updated_at' => now(),
            ]);
        }

        $pro = DB::table('products')->where('name', 'Pro')->first();
        if ($pro) {
            DB::table('prices')->where('product_id', $pro->id)->update(['default' => false]);
            $price = DB::table('prices')->where('product_id', $pro->id)
                ->where('currency', 'ETB')->where('interval', 'month')
                ->where('interval_count', 1)->where('amount', 500)->first();
            if ($price) {
                DB::table('prices')->where('id', $price->id)->update(['default' => true]);
            } else {
                DB::table('prices')->insert([
                    'product_id' => $pro->id,
                    'amount' => 500,
                    'currency' => 'ETB',
                    'interval' => 'month',
                    'interval_count' => 1,
                    'default' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        // Historical plan and price values cannot be restored reliably.
    }
};
