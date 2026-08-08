<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    private const FREE_BENEFITS = [
        'max_products' => 5,
        'commission_bps' => 500,
        'max_upload_bytes' => 1073741824,
    ];

    private const PRO_BENEFITS = [
        'max_products' => null,
        'commission_bps' => 0,
        'max_upload_bytes' => 26843545600,
    ];

    public function up(): void
    {
        if (!DB::getSchemaBuilder()->hasTable('products')) {
            return;
        }

        $freePlan = DB::table('products')->where('free', true)->first();

        if ($freePlan) {
            DB::table('products')->where('id', $freePlan->id)->update([
                'name' => 'Free',
                'storefront_benefits' => json_encode(self::FREE_BENEFITS),
                'updated_at' => now(),
            ]);

            $this->syncFreePlanPermissions($freePlan->id);
        } else {
            $existingFree = DB::table('products')->where('name', 'Free')->first();
            if (!$existingFree) {
                DB::table('products')->insert([
                    'name' => 'Free',
                    'uuid' => Str::uuid()->toString(),
                    'free' => true,
                    'recommended' => false,
                    'position' => 1,
                    'storefront_benefits' => json_encode(self::FREE_BENEFITS),
                    'feature_list' => json_encode([
                        ['value' => '1 Storefront / Link in Bio'],
                        ['value' => '5 Digital Products'],
                        ['value' => '5% Linket transaction fee'],
                        ['value' => '1 GB Storage'],
                        ['value' => 'Basic Insights'],
                    ]),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        $proPlan = DB::table('products')
            ->where('free', false)
            ->orderBy('position', 'desc')
            ->first();

        if ($proPlan) {
            DB::table('products')->where('id', $proPlan->id)->update([
                'name' => 'Pro',
                'recommended' => true,
                'storefront_benefits' => json_encode(self::PRO_BENEFITS),
                'updated_at' => now(),
            ]);

            $this->syncProPlanPermissions($proPlan->id);
        }

        $keepIds = collect([
            $freePlan?->id,
            $proPlan?->id,
        ])->filter()->values()->all();

        if (count($keepIds) > 0) {
            $subscriptionsTable = DB::table('subscriptions')
                ->whereNotIn('product_id', $keepIds)
                ->whereNull('ends_at')
                ->count();

            if ($subscriptionsTable > 0) {
                $fallbackPlanId = $freePlan?->id ?? $proPlan?->id;
                if ($fallbackPlanId) {
                    DB::table('subscriptions')
                        ->whereNotIn('product_id', $keepIds)
                        ->whereNull('ends_at')
                        ->update(['product_id' => $fallbackPlanId]);
                }
            }
        }

        if (count($keepIds) > 0 && count($keepIds) < DB::table('products')->count()) {
            $oldPlanIds = DB::table('products')
                ->whereNotIn('id', $keepIds)
                ->where('free', false)
                ->pluck('id');

            foreach ($oldPlanIds as $oldId) {
                $subscriptionCount = DB::table('subscriptions')
                    ->where('product_id', $oldId)
                    ->count();

                if ($subscriptionCount === 0) {
                    DB::table('permissionables')
                        ->where('permissionable_type', 'product')
                        ->where('permissionable_id', $oldId)
                        ->delete();
                    DB::table('products')->where('id', $oldId)->delete();
                }
            }
        }
    }

    private function syncFreePlanPermissions(int $planId): void
    {
        if (!DB::getSchemaBuilder()->hasTable('permissionables')) {
            return;
        }

        $permissionName = 'biolinks.create';

        $biolinkPerm = DB::table('permissions')->where('name', $permissionName)->first();

        if (!$biolinkPerm) {
            return;
        }

        $biolinkPermId = $biolinkPerm->id;

        $existing = DB::table('permissionables')
            ->where('permissionable_type', 'product')
            ->where('permissionable_id', $planId)
            ->where('permission_id', $biolinkPermId)
            ->first();

        if ($existing) {
            DB::table('permissionables')
                ->where('permissionable_type', 'product')
                ->where('permissionable_id', $planId)
                ->where('permission_id', $biolinkPermId)
                ->update(['restrictions' => json_encode([['name' => 'count', 'value' => 1]])]);
        } else {
            DB::table('permissionables')->insert([
                'permissionable_type' => 'product',
                'permissionable_id' => $planId,
                'permission_id' => $biolinkPermId,
                'restrictions' => json_encode([['name' => 'count', 'value' => 1]]),
            ]);
        }
    }

    private function syncProPlanPermissions(int $planId): void
    {
        if (!DB::getSchemaBuilder()->hasTable('permissionables')) {
            return;
        }

        $biolinkPerm = DB::table('permissions')->where('name', 'biolinks.create')->first();

        if ($biolinkPerm) {
            $existing = DB::table('permissionables')
                ->where('permissionable_type', 'product')
                ->where('permissionable_id', $planId)
                ->where('permission_id', $biolinkPerm->id)
                ->first();

            if ($existing) {
                DB::table('permissionables')
                    ->where('permissionable_type', 'product')
                    ->where('permissionable_id', $planId)
                    ->where('permission_id', $biolinkPerm->id)
                    ->update(['restrictions' => json_encode([['name' => 'count', 'value' => 999999]])]);
            }
        }
    }

    public function down(): void
    {
        // Irreversible — restoring old plan names/positions is not supported
    }
};