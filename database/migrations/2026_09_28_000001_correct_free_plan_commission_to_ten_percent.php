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
 *
 * Rows whose storefront_benefits is NULL or not a JSON object are left alone
 * (the same guard 2026_08_10_213516_* applies). Writing a fee-only object over
 * an empty one would give Entitlements::benefitsFor() a non-empty array to
 * return early on, skipping the default-plan and config('store.default_benefits')
 * fallbacks and normalizing every max_* entitlement to null = unlimited. The
 * feature_list copy fix is independent of that guard and still runs.
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

        $benefits = $freePlan->storefront_benefits;
        if (is_string($benefits)) {
            $benefits = json_decode($benefits, true);
        }
        if (!is_array($benefits) || $benefits === []) {
            $benefits = null;
        }

        $update = ['updated_at' => now()];

        if ($benefits !== null) {
            $benefits['commission_bps'] = self::FREE_COMMISSION_BPS;
            $benefits['platform_fee_percent'] = self::FREE_PLATFORM_FEE_PERCENT;

            $update['storefront_benefits'] = json_encode($benefits);
        }

        $featureList = json_decode($freePlan->feature_list ?? '', true);
        if (is_array($featureList)) {
            $featureChanged = false;
            foreach ($featureList as $index => $feature) {
                if (is_string($feature) && preg_match(self::FEE_FEATURE_PATTERN, $feature)) {
                    $featureList[$index] = '10% Linket transaction fee';
                    $featureChanged = true;
                }
            }
            if ($featureChanged) {
                $update['feature_list'] = json_encode($featureList);
            }
        }

        if (count($update) === 1) {
            return;
        }

        DB::table('products')->where('id', $freePlan->id)->update($update);
    }

    public function down(): void
    {
        // Irreversible — the 10% Free rate is the documented product fact.
    }
};
