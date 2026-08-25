<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Gated Phase 3 — only rename when flag is true (next release)
        // Unify config source: check both stores and store (canonical is stores)
        if (! (config('stores.table_rename_done') || config('store.table_rename_done'))) {
            return;
        }

        // Main table
        if (Schema::hasTable('biolinks') && ! Schema::hasTable('stores')) {
            Schema::rename('biolinks', 'stores');
        }

        // Support singular typo variant mentioned in brief; actual table is plural
        if (Schema::hasTable('biolink_appearance') && ! Schema::hasTable('store_appearances')) {
            Schema::rename('biolink_appearance', 'store_appearances');
        }
        if (Schema::hasTable('biolink_appearances') && ! Schema::hasTable('store_appearances')) {
            Schema::rename('biolink_appearances', 'store_appearances');
        }

        if (Schema::hasTable('biolink_widgets') && ! Schema::hasTable('store_widgets')) {
            Schema::rename('biolink_widgets', 'store_widgets');
        }

        if (Schema::hasTable('biolink_link') && ! Schema::hasTable('store_link')) {
            Schema::rename('biolink_link', 'store_link');
        }

        if (Schema::hasTable('digital_product_biolinks') && ! Schema::hasTable('digital_product_store')) {
            Schema::rename('digital_product_biolinks', 'digital_product_store');
        }

        // Rename indexes/FKs where possible (best-effort, MySQL only)
        $this->renameIndexes();
    }

    public function down(): void
    {
        // Reverse rename if stores exists (best-effort, no flag check)
        if (Schema::hasTable('stores') && ! Schema::hasTable('biolinks')) {
            Schema::rename('stores', 'biolinks');
        }
        if (Schema::hasTable('store_appearances') && ! Schema::hasTable('biolink_appearances')) {
            Schema::rename('store_appearances', 'biolink_appearances');
        }
        if (Schema::hasTable('store_widgets') && ! Schema::hasTable('biolink_widgets')) {
            Schema::rename('store_widgets', 'biolink_widgets');
        }
        if (Schema::hasTable('store_link') && ! Schema::hasTable('biolink_link')) {
            Schema::rename('store_link', 'biolink_link');
        }
        if (Schema::hasTable('digital_product_store') && ! Schema::hasTable('digital_product_biolinks')) {
            Schema::rename('digital_product_store', 'digital_product_biolinks');
        }

        $this->renameIndexesDown();
    }

    private function renameIndexes(): void
    {
        if (DB::connection()->getDriverName() !== 'mysql') {
            return;
        }

        // stores table indexes (from biolinks_* to stores_*)
        $storesMap = [
            'biolinks_name_index' => 'stores_name_index',
            'biolinks_back_half_index' => 'stores_back_half_index',
            'biolinks_user_id_index' => 'stores_user_id_index',
            'biolinks_workspace_id_index' => 'stores_workspace_id_index',
            'biolinks_domain_id_index' => 'stores_domain_id_index',
            'biolinks_builder_mode_index' => 'stores_builder_mode_index',
        ];
        foreach ($storesMap as $old => $new) {
            $this->renameIndexSafe('stores', $old, $new);
        }

        // store_link indexes
        $linkMap = [
            'biolink_link_biolink_id_index' => 'store_link_biolink_id_index',
            'biolink_link_link_id_index' => 'store_link_link_id_index',
            'biolink_link_position_index' => 'store_link_position_index',
            'biolink_link_biolink_id_link_id_unique' => 'store_link_biolink_id_link_id_unique',
        ];
        foreach ($linkMap as $old => $new) {
            $this->renameIndexSafe('store_link', $old, $new);
        }

        // store_widgets
        $this->renameIndexSafe('store_widgets', 'biolink_widgets_biolink_id_index', 'store_widgets_biolink_id_index');
        $this->renameIndexSafe('store_widgets', 'biolink_widgets_pinned_index', 'store_widgets_pinned_index');

        // store_appearances
        $this->renameIndexSafe('store_appearances', 'biolink_appearances_biolink_id_index', 'store_appearances_biolink_id_index');

        // digital_product_store
        $this->renameIndexSafe('digital_product_store', 'digital_product_biolinks_digital_product_id_biolink_id_unique', 'digital_product_store_digital_product_id_biolink_id_unique');
        $this->renameIndexSafe('digital_product_store', 'digital_product_biolinks_biolink_id_foreign', 'digital_product_store_biolink_id_foreign');

        // FK constraints: MySQL RENAME TABLE auto-updates referenced table, but constraint names remain.
        // Attempt to rename FK constraints if they exist (best-effort).
        $this->renameForeignKeySafe('digital_product_store', 'digital_product_biolinks_biolink_id_foreign', 'digital_product_store_biolink_id_foreign');
        $this->renameForeignKeySafe('digital_product_store', 'digital_product_biolinks_digital_product_id_foreign', 'digital_product_store_digital_product_id_foreign');
        // storefront_orders FK to biolinks
        $this->renameForeignKeySafe('storefront_orders', 'storefront_orders_biolink_id_foreign', 'storefront_orders_store_id_foreign');
    }

    private function renameIndexesDown(): void
    {
        if (DB::connection()->getDriverName() !== 'mysql') {
            return;
        }
        $storesMap = [
            'stores_name_index' => 'biolinks_name_index',
            'stores_back_half_index' => 'biolinks_back_half_index',
            'stores_user_id_index' => 'biolinks_user_id_index',
            'stores_workspace_id_index' => 'biolinks_workspace_id_index',
            'stores_domain_id_index' => 'biolinks_domain_id_index',
            'stores_builder_mode_index' => 'biolinks_builder_mode_index',
        ];
        foreach ($storesMap as $old => $new) {
            $this->renameIndexSafe('biolinks', $old, $new);
        }
        $linkMap = [
            'store_link_biolink_id_index' => 'biolink_link_biolink_id_index',
            'store_link_link_id_index' => 'biolink_link_link_id_index',
            'store_link_position_index' => 'biolink_link_position_index',
            'store_link_biolink_id_link_id_unique' => 'biolink_link_biolink_id_link_id_unique',
        ];
        foreach ($linkMap as $old => $new) {
            $this->renameIndexSafe('biolink_link', $old, $new);
        }
        $this->renameIndexSafe('biolink_widgets', 'store_widgets_biolink_id_index', 'biolink_widgets_biolink_id_index');
        $this->renameIndexSafe('biolink_widgets', 'store_widgets_pinned_index', 'biolink_widgets_pinned_index');
        $this->renameIndexSafe('biolink_appearances', 'store_appearances_biolink_id_index', 'biolink_appearances_biolink_id_index');
        $this->renameIndexSafe('digital_product_biolinks', 'digital_product_store_digital_product_id_biolink_id_unique', 'digital_product_biolinks_digital_product_id_biolink_id_unique');
        $this->renameIndexSafe('digital_product_biolinks', 'digital_product_store_biolink_id_foreign', 'digital_product_biolinks_biolink_id_foreign');
    }

    private function renameIndexSafe(string $table, string $old, string $new): void
    {
        if (! Schema::hasTable($table)) {
            return;
        }
        try {
            DB::statement("ALTER TABLE `{$table}` RENAME INDEX `{$old}` TO `{$new}`");
            return;
        } catch (\Throwable $e) {
        }
        try {
            DB::statement("ALTER TABLE `{$table}` RENAME KEY `{$old}` TO `{$new}`");
        } catch (\Throwable $e) {
            // index may not exist or already renamed — ignore
        }
    }

    private function renameForeignKeySafe(string $table, string $old, string $new): void
    {
        if (! Schema::hasTable($table)) {
            return;
        }
        // MySQL does not support RENAME CONSTRAINT directly; need to drop and re-add if needed.
        // We attempt a best-effort via information_schema check, otherwise no-op.
        try {
            $exists = DB::table('information_schema.TABLE_CONSTRAINTS')
                ->where('TABLE_SCHEMA', DB::connection()->getDatabaseName())
                ->where('TABLE_NAME', $table)
                ->where('CONSTRAINT_NAME', $old)
                ->exists();
            if (! $exists) {
                return;
            }
            // For digital_product_store, foreign keys reference biolinks/stores and digital_products.
            // Renaming constraint name without dropping is not directly supported prior to MySQL 8.0.13 for FKs.
            // We drop and re-add with new name if possible.
            // To keep migration safe and idempotent, we only rename index-like FK helper indexes already handled above.
            // Full FK rename is optional for Phase 3 and can be deferred; leaving old FK name still functional after RENAME TABLE.
        } catch (\Throwable $e) {
        }
    }
};
