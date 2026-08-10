<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->boolean('is_default')->default(false)->after('free');
        });

        Schema::table('storefront_orders', function (Blueprint $table) {
            $table->decimal('platform_fee_percent', 6, 4)->nullable()->after('commission_bps');
        });

        $defaultProduct = DB::table('products')->where('free', true)->orderBy('position')->first();
        if ($defaultProduct) {
            DB::table('products')->where('id', $defaultProduct->id)->update(['is_default' => true]);
        }

        $plans = DB::table('products')->whereNotNull('storefront_benefits')->get();
        foreach ($plans as $plan) {
            $benefits = json_decode($plan->storefront_benefits, true);
            if (!is_array($benefits)) {
                continue;
            }

            $updated = false;

            if (!isset($benefits['platform_fee_percent']) && isset($benefits['commission_bps'])) {
                $benefits['platform_fee_percent'] = round(((int) $benefits['commission_bps']) / 100, 4);
                $updated = true;
            }

            if (!isset($benefits['max_storefronts'])) {
                $benefits['max_storefronts'] = DB::table('permissionables')
                    ->where('permissionable_type', 'product')
                    ->where('permissionable_id', $plan->id)
                    ->join('permissions', 'permissions.id', '=', 'permissionables.permission_id')
                    ->where('permissions.name', 'biolinks.create')
                    ->value('permissionables.restrictions');
                $biolinkRestriction = $benefits['max_storefronts'];
                $decoded = is_string($biolinkRestriction) ? json_decode($biolinkRestriction, true) : null;
                $countVal = null;
                if (is_array($decoded)) {
                    foreach ($decoded as $r) {
                        if (($r['name'] ?? null) === 'count') {
                            $val = $r['value'] ?? null;
                            if ($val !== null && $val !== '' && (int) $val !== 999999) {
                                $countVal = (int) $val;
                            }
                            break;
                        }
                    }
                }
                $benefits['max_storefronts'] = $countVal;
                $updated = true;
            }

            if (!isset($benefits['max_workspaces'])) {
                $wsRestriction = DB::table('permissionables')
                    ->where('permissionable_type', 'product')
                    ->where('permissionable_id', $plan->id)
                    ->join('permissions', 'permissions.id', '=', 'permissionables.permission_id')
                    ->where('permissions.name', 'workspaces.create')
                    ->value('permissionables.restrictions');
                $decoded = is_string($wsRestriction) ? json_decode($wsRestriction, true) : null;
                $countVal = null;
                if (is_array($decoded)) {
                    foreach ($decoded as $r) {
                        if (($r['name'] ?? null) === 'count') {
                            $val = $r['value'] ?? null;
                            if ($val !== null && $val !== '' && (int) $val !== 999999) {
                                $countVal = (int) $val;
                            }
                            break;
                        }
                    }
                }
                $benefits['max_workspaces'] = $countVal;
                $updated = true;
            }

            if (!isset($benefits['max_free_products'])) {
                $benefits['max_free_products'] = $benefits['max_products'] ?? null;
                $updated = true;
            }

            if (!isset($benefits['max_paid_products'])) {
                $benefits['max_paid_products'] = $benefits['max_products'] ?? null;
                $updated = true;
            }

            if (!isset($benefits['tracking_pixels_enabled'])) {
                $tpRestriction = DB::table('permissionables')
                    ->where('permissionable_type', 'product')
                    ->where('permissionable_id', $plan->id)
                    ->join('permissions', 'permissions.id', '=', 'permissionables.permission_id')
                    ->where('permissions.name', 'tracking_pixels.create')
                    ->value('permissionables.restrictions');
                $decoded = is_string($tpRestriction) ? json_decode($tpRestriction, true) : null;
                $enabled = false;
                if (is_array($decoded)) {
                    foreach ($decoded as $r) {
                        if (($r['name'] ?? null) === 'count') {
                            $val = $r['value'] ?? null;
                            $enabled = $val !== null && $val !== '' && (int) $val !== 0 && (int) $val !== 999999 ? true : ((int) $val === 999999);
                            break;
                        }
                    }
                }
                if (!$enabled && DB::table('permissionables')->where('permissionable_type', 'product')->where('permissionable_id', $plan->id)->join('permissions', 'permissions.id', '=', 'permissionables.permission_id')->where('permissions.name', 'tracking_pixels.create')->exists()) {
                    $enabled = false;
                }
                $benefits['tracking_pixels_enabled'] = $enabled;
                $updated = true;
            }

            if (!isset($benefits['advanced_analytics_enabled'])) {
                $benefits['advanced_analytics_enabled'] = false;
                $updated = true;
            }

            if ($updated) {
                DB::table('products')->where('id', $plan->id)->update([
                    'storefront_benefits' => json_encode($benefits),
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('is_default');
        });
        Schema::table('storefront_orders', function (Blueprint $table) {
            $table->dropColumn('platform_fee_percent');
        });
    }
};