<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasColumn('storefront_orders', 'collection_owner')) {
            Schema::table('storefront_orders', function (Blueprint $table): void {
                $table->string('collection_owner', 32)->nullable()->after('payment_gateway')->index();
            });

            // Backfill historical orders to preserve custody invariants (FIN-01):
            // Historical seller Chapa checkouts were collected into creator merchant accounts.
            // Verify.et direct checkouts were collected into creator bank/wallet accounts.
            // None of these are platform liabilities.
            DB::table('storefront_orders')
                ->where('payment_gateway', 'chapa')
                ->whereNull('collection_owner')
                ->update(['collection_owner' => 'creator_chapa']);

            DB::table('storefront_orders')
                ->where(function ($query) {
                    $query->where('payment_gateway', 'verify_et')
                        ->orWhereNotNull('payment_account_snapshot');
                })
                ->whereNull('collection_owner')
                ->update(['collection_owner' => 'verify_et_creator']);

            // Any remaining historical storefront orders default to creator_chapa to prevent spurious platform claims
            DB::table('storefront_orders')
                ->whereNull('collection_owner')
                ->update(['collection_owner' => 'creator_chapa']);
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('storefront_orders', 'collection_owner')) {
            Schema::table('storefront_orders', function (Blueprint $table): void {
                $table->dropIndex(['collection_owner']);
                $table->dropColumn('collection_owner');
            });
        }
    }
};
