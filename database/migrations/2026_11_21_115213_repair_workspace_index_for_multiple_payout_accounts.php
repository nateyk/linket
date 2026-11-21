<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const TABLE = 'digital_product_payout_methods';
    private const LEGACY_UNIQUE = 'digital_product_payout_methods_workspace_id_creator_id_unique';

    public function up(): void
    {
        if (!Schema::hasIndex(self::TABLE, self::LEGACY_UNIQUE, 'unique')) {
            return;
        }

        // InnoDB needs an index on workspace_id to enforce the existing foreign key.
        if (!Schema::hasIndex(self::TABLE, ['workspace_id'])) {
            Schema::table(self::TABLE, function (Blueprint $table): void {
                $table->index('workspace_id');
            });
        }

        Schema::table(self::TABLE, function (Blueprint $table): void {
            $table->dropUnique(self::LEGACY_UNIQUE);
        });
    }

    public function down(): void
    {
        // Restoring uniqueness would conflict with creators who added a second account.
    }
};
