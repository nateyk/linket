<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('digital_product_payment_refunds')) {
            Schema::table('digital_product_payment_refunds', function (Blueprint $table): void {
                $table->unsignedBigInteger('payment_transaction_id')->nullable()->change();

                if (!Schema::hasColumn('digital_product_payment_refunds', 'status')) {
                    $table->string('status', 32)->default('completed')->after('reason')->index();
                }

                if (!Schema::hasColumn('digital_product_payment_refunds', 'chapa_refund_reference')) {
                    $table->string('chapa_refund_reference', 190)->nullable()->after('external_reference')->index();
                }
            });

            try {
                DB::statement('CREATE UNIQUE INDEX dp_refund_order_ext_ref_uq ON digital_product_payment_refunds (storefront_order_id, external_reference)');
            } catch (\Throwable) {}
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('digital_product_payment_refunds')) {
            try {
                DB::statement('DROP INDEX dp_refund_order_ext_ref_uq ON digital_product_payment_refunds');
            } catch (\Throwable) {}

            Schema::table('digital_product_payment_refunds', function (Blueprint $table): void {
                if (Schema::hasColumn('digital_product_payment_refunds', 'chapa_refund_reference')) {
                    $table->dropIndex(['chapa_refund_reference']);
                    $table->dropColumn('chapa_refund_reference');
                }

                if (Schema::hasColumn('digital_product_payment_refunds', 'status')) {
                    $table->dropIndex(['status']);
                    $table->dropColumn('status');
                }
            });
        }
    }
};
