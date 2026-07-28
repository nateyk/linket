<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasColumn('link_groups', 'type')) {
            DB::table('link_groups')
                ->where('type', 'linkGroup')
                ->update(['type' => 'folder']);
        }

        DB::table('permissions')
            ->where('name', 'like', 'link_groups.%')
            ->update([
                'name' => DB::raw("REPLACE(name, 'link_groups.', 'folders.')"),
            ]);

        Schema::rename('link_clicks', 'tracked_events');
        Schema::rename('link_groups', 'folders');

        if (Schema::hasTable('link_group_link')) {
            Schema::rename('link_group_link', 'folder_link');
        }

        Schema::table('tracked_events', function (Blueprint $table) {
            if (!Schema::hasColumn('tracked_events', 'event_type')) {
                $table->string('event_type', 20)->default('click')->index();
            }
            if (!Schema::hasColumn('tracked_events', 'user_id')) {
                $table->renameColumn('owner_id', 'user_id');
            }
            if (!Schema::hasColumn('tracked_events', 'workspace_id')) {
                $table
                    ->integer('workspace_id')
                    ->default(0)
                    ->index()
                    ->after('user_id');
            }
            if (!Schema::hasColumn('tracked_events', 'domain_id')) {
                $table
                    ->integer('domain_id')
                    ->default(0)
                    ->index()
                    ->after('workspace_id');
            }
        });

        if (Schema::hasTable('folder_link')) {
            Schema::table('folder_link', function (Blueprint $table) {
                $table->renameColumn('link_group_id', 'folder_id');
                if (Schema::hasColumn('folder_link', 'type')) {
                    $table->string('type', 20)->default('link')->change();
                }
            });
        }
    }
};
