<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * PRODUCT.md states the commission rates as product facts: Free 10%, Pro 5%.
 *
 * The installed Free plan row still carried the pre-correction 5% figures
 * (commission_bps 500 / platform_fee_percent 5 and the matching
 * "5% Linket transaction fee" feature string) because migrations that already
 * ran do not re-run. 2026_08_08_221006_simplify_plans_to_free_pro.php carries
 * the same 10% fact for fresh installs; this migration brings existing rows
 * in line with it.
 */
return new class extends Migration
{
    private const FREE_COMMISSION_BPS = 1000;

    private const FREE_PLATFORM_FEE_PERCENT = 10;

    private const FEE_FEATURE_PATTERN = '/^\d+(\.\d+)?% Linket transaction fee$/';

    public function up(): void
    {
        if (!DB::getSchemaBuilder()->hasTable('products')) {
            return;
        }

        $freePlan = DB::table('products')->where('free', true)->first()
            ?? DB::table('products')->where('name', 'Free')->first();

        if (!$freePlan) {
            return;
        }

        $benefits = json_decode($freePlan->storefront_benefits ?? '', true);
        if (!is_array($benefits)) {
            $benefits = [];
        }

        $benefits['commission_bps'] = self::FREE_COMMISSION_BPS;
        $benefits['platform_fee_percent'] = self::FREE_PLATFORM_FEE_PERCENT;

        $update = [
            'storefront_benefits' => json_encode($benefits),
            'updated_at' => now(),
        ];

        $featureList = json_decode($freePlan->feature_list ?? '', true);
        if (is_array($featureList)) {
            foreach ($featureList as $index => $feature) {
                if (is_string($feature) && preg_match(self::FEE_FEATURE_PATTERN, $feature)) {
                    $featureList[$index] = '10% Linket transaction fee';
                }
            }
            $update['feature_list'] = json_encode($featureList);
        }

        DB::table('products')->where('id', $freePlan->id)->update($update);
    }

    public function down(): void
    {
        // Irreversible — the 10% Free rate is the documented product fact.
    }
};
