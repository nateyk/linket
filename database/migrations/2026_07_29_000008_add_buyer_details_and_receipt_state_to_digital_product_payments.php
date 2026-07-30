<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('storefront_orders', function (Blueprint $table): void {
            if (!Schema::hasColumn('storefront_orders', 'buyer_name')) {
                $table->string('buyer_name')->nullable()->after('buyer_email');
            }

            if (!Schema::hasColumn('storefront_orders', 'receipt_sent_at')) {
                $table->timestamp('receipt_sent_at')->nullable()->after('paid_at');
            }
        });

        Schema::table('payment_transactions', function (Blueprint $table): void {
            if (!Schema::hasColumn('payment_transactions', 'buyer_name')) {
                $table->string('buyer_name')->nullable()->after('buyer_email');
            }
        });
    }

    public function down(): void
    {
        Schema::table('payment_transactions', function (Blueprint $table): void {
            if (Schema::hasColumn('payment_transactions', 'buyer_name')) {
                $table->dropColumn('buyer_name');
            }
        });

        Schema::table('storefront_orders', function (Blueprint $table): void {
            $columns = array_filter([
                Schema::hasColumn('storefront_orders', 'buyer_name') ? 'buyer_name' : null,
                Schema::hasColumn('storefront_orders', 'receipt_sent_at') ? 'receipt_sent_at' : null,
            ]);

            if ($columns) {
                $table->dropColumn($columns);
            }
        });
    }
};
