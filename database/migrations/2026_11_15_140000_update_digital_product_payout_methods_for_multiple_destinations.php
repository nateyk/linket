<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    private const TABLE = 'digital_product_payout_methods';

    public function up(): void
    {
        if (!Schema::hasTable(self::TABLE)) {
            return;
        }

        $this->dropLegacyUniqueIndex();
        $this->addColumns();
    }

    public function down(): void
    {
        if (!Schema::hasTable(self::TABLE)) {
            return;
        }

        $this->dropColumns();
    }

    private function dropLegacyUniqueIndex(): void
    {
        try {
            Schema::table(self::TABLE, function (Blueprint $table): void {
                $table->dropUnique(['workspace_id', 'creator_id']);
            });
        } catch (\Throwable) {
            // Index already dropped or direct unique drop unsupported by driver
        }
    }

    private function addColumns(): void
    {
        Schema::table(self::TABLE, function (Blueprint $table): void {
            if (!Schema::hasColumn(self::TABLE, 'bank_code')) {
                $table->string('bank_code', 64)->nullable()->after('withdrawal_method_id');
            }
            if (!Schema::hasColumn(self::TABLE, 'bank_name')) {
                $table->string('bank_name', 160)->nullable()->after('bank_code');
            }
            if (!Schema::hasColumn(self::TABLE, 'account_number_last_four')) {
                $table->string('account_number_last_four', 8)->nullable()->after('destination');
            }
            if (!Schema::hasColumn(self::TABLE, 'is_active')) {
                $table->boolean('is_active')->default(true)->index()->after('display_label');
            }
            if (!Schema::hasColumn(self::TABLE, 'is_default')) {
                $table->boolean('is_default')->default(false)->after('is_active');
            }
            if (!Schema::hasColumn(self::TABLE, 'status')) {
                $table->string('status', 32)->default('active')->index()->after('is_default');
            }
            if (!Schema::hasColumn(self::TABLE, 'metadata')) {
                $table->json('metadata')->nullable()->after('status');
            }
        });
    }

    private function dropColumns(): void
    {
        $columns = [
            'bank_code',
            'bank_name',
            'account_number_last_four',
            'is_active',
            'is_default',
            'status',
            'metadata',
        ];

        Schema::table(self::TABLE, function (Blueprint $table) use ($columns): void {
            foreach ($columns as $column) {
                if (Schema::hasColumn(self::TABLE, $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
