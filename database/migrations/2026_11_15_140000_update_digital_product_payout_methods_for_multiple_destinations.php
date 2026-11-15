<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('digital_product_payout_methods')) {
            // Drop the single-method unique index if present
            try {
                Schema::table('digital_product_payout_methods', function (Blueprint $table): void {
                    $table->dropUnique(['workspace_id', 'creator_id']);
                });
            } catch (\Throwable) {
                // Ignore if unique index does not exist or driver does not support dropping unique constraint directly
            }

            Schema::table('digital_product_payout_methods', function (Blueprint $table): void {
                if (!Schema::hasColumn('digital_product_payout_methods', 'bank_code')) {
                    $table->string('bank_code', 64)->nullable()->after('withdrawal_method_id');
                }
                if (!Schema::hasColumn('digital_product_payout_methods', 'bank_name')) {
                    $table->string('bank_name', 160)->nullable()->after('bank_code');
                }
                if (!Schema::hasColumn('digital_product_payout_methods', 'account_number_last_four')) {
                    $table->string('account_number_last_four', 8)->nullable()->after('destination');
                }
                if (!Schema::hasColumn('digital_product_payout_methods', 'is_active')) {
                    $table->boolean('is_active')->default(true)->index()->after('display_label');
                }
                if (!Schema::hasColumn('digital_product_payout_methods', 'is_default')) {
                    $table->boolean('is_default')->default(false)->after('is_active');
                }
                if (!Schema::hasColumn('digital_product_payout_methods', 'status')) {
                    $table->string('status', 32)->default('active')->index()->after('is_default');
                }
                if (!Schema::hasColumn('digital_product_payout_methods', 'metadata')) {
                    $table->json('metadata')->nullable()->after('status');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('digital_product_payout_methods')) {
            Schema::table('digital_product_payout_methods', function (Blueprint $table): void {
                $columns = [
                    'bank_code',
                    'bank_name',
                    'account_number_last_four',
                    'is_active',
                    'is_default',
                    'status',
                    'metadata',
                ];
                foreach ($columns as $column) {
                    if (Schema::hasColumn('digital_product_payout_methods', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }
    }
};
