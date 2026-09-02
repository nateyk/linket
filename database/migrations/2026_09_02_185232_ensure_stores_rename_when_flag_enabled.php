<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Compensate for 2026_08_24 rename being skipped when flag was false.
        // If deployment flips STORES_TABLE_RENAME_DONE to true after that migration
        // was recorded as "ran", the biolinks tables would never be renamed.
        // This migration is intentionally not gated on "already ran" — it checks
        // the current flag and the actual table existence on every deploy.
        if (! (config('stores.table_rename_done') || config('store.table_rename_done'))) {
            return;
        }

        if (Schema::hasTable('biolinks') && ! Schema::hasTable('stores')) {
            Schema::rename('biolinks', 'stores');
        }
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

        $this->renameIndexes();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
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
        if (\Illuminate\Support\Facades\DB::connection()->getDriverName() !== 'mysql') {
            return;
        }
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
        $linkMap = [
            'biolink_link_biolink_id_index' => 'store_link_biolink_id_index',
            'biolink_link_link_id_index' => 'store_link_link_id_index',
            'biolink_link_position_index' => 'store_link_position_index',
            'biolink_link_biolink_id_link_id_unique' => 'store_link_biolink_id_link_id_unique',
        ];
        foreach ($linkMap as $old => $new) {
            $this->renameIndexSafe('store_link', $old, $new);
        }
        $this->renameIndexSafe('store_widgets', 'biolink_widgets_biolink_id_index', 'store_widgets_biolink_id_index');
        $this->renameIndexSafe('store_widgets', 'biolink_widgets_pinned_index', 'store_widgets_pinned_index');
        $this->renameIndexSafe('store_appearances', 'biolink_appearances_biolink_id_index', 'store_appearances_biolink_id_index');
        $this->renameIndexSafe('digital_product_store', 'digital_product_biolinks_digital_product_id_biolink_id_unique', 'digital_product_store_digital_product_id_biolink_id_unique');
        $this->renameIndexSafe('digital_product_store', 'digital_product_biolinks_biolink_id_foreign', 'digital_product_store_biolink_id_foreign');
    }

    private function renameIndexesDown(): void
    {
        if (\Illuminate\Support\Facades\DB::connection()->getDriverName() !== 'mysql') {
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
            \Illuminate\Support\Facades\DB::statement("ALTER TABLE `{$table}` RENAME INDEX `{$old}` TO `{$new}`");
            return;
        } catch (\Throwable $e) {
        }
        try {
            \Illuminate\Support\Facades\DB::statement("ALTER TABLE `{$table}` RENAME KEY `{$old}` TO `{$new}`");
        } catch (\Throwable $e) {
        }
    }
};
