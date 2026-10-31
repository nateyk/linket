<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('products', 'system_key')) {
            Schema::table('products', function (Blueprint $table): void {
                $table->string('system_key', 40)->nullable()->unique();
            });
        }

        if (!Schema::hasColumn('pro_subscription_payments', 'price_id')) {
            Schema::table('pro_subscription_payments', function (Blueprint $table): void {
                $table->foreignId('price_id')->nullable()->after('product_id')->constrained('prices')->restrictOnDelete();
            });
        }

        if (!Schema::hasTable('plan_change_audits')) {
            Schema::create('plan_change_audits', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();
                $table->string('product_name');
                $table->unsignedInteger('actor_id')->nullable();
                $table->foreign('actor_id')->references('id')->on('users')->nullOnDelete();
                $table->string('change_type', 24);
                $table->json('before')->nullable();
                $table->json('after');
                $table->timestamp('created_at')->useCurrent();
                $table->index(['product_id', 'created_at']);
            });
        }

        $free = DB::table('products')->where('free', true)->orderBy('id')->first();
        if ($free) {
            DB::table('products')->where('id', $free->id)->update(['system_key' => 'free']);
        }

        $pro = DB::table('products')->where('name', 'Pro')->orderBy('id')->first();
        if (!$pro) {
            $proId = DB::table('products')->insertGetId([
                'uuid' => (string) Str::uuid(),
                'name' => 'Pro',
                'free' => false,
                'is_default' => false,
                'active' => true,
                'recommended' => true,
                'position' => 2,
                'storefront_benefits' => json_encode(['commission_bps' => 0, 'platform_fee_percent' => 0]),
                'feature_list' => json_encode(['No commission on new sales', 'Unlimited eligible verified sales while subscribed']),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $pro = (object) ['id' => $proId];
        }
        DB::table('products')->where('id', $pro->id)->update(['system_key' => 'pro']);

        if (!DB::table('prices')->where('product_id', $pro->id)->where('currency', 'ETB')->where('interval', 'month')->where('interval_count', 1)->exists()) {
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

        DB::table('pro_subscription_payments')->orderBy('id')->chunkById(100, function ($payments): void {
            foreach ($payments as $payment) {
                $priceId = DB::table('prices')->where('product_id', $payment->product_id)
                    ->whereRaw('ROUND(amount * 100) = ?', [$payment->amount_cents])
                    ->orderByDesc('default')->orderByDesc('id')->value('id');
                if ($priceId) {
                    DB::table('pro_subscription_payments')->where('id', $payment->id)->update(['price_id' => $priceId]);
                }
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('plan_change_audits');
        if (Schema::hasColumn('pro_subscription_payments', 'price_id')) {
            Schema::table('pro_subscription_payments', function (Blueprint $table): void {
                $table->dropConstrainedForeignId('price_id');
            });
        }
        if (Schema::hasColumn('products', 'system_key')) {
            Schema::table('products', function (Blueprint $table): void {
                $table->dropUnique(['system_key']);
                $table->dropColumn('system_key');
            });
        }
    }
};
