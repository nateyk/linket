<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $plans = DB::table('products')->get();

        foreach ($plans as $plan) {
            $list = json_decode($plan->feature_list, true);

            if (!is_array($list)) {
                continue;
            }

            $hasObjects = false;
            foreach ($list as $item) {
                if (is_array($item) && isset($item['value'])) {
                    $hasObjects = true;
                    break;
                }
            }

            if (!$hasObjects) {
                continue;
            }

            $fixed = array_map(fn($item) => $item['value'] ?? '', $list);

            DB::table('products')->where('id', $plan->id)->update([
                'feature_list' => json_encode(array_values($fixed)),
            ]);
        }
    }

    public function down(): void {}
};