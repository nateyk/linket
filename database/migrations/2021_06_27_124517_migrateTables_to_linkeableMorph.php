<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class MigrateTablesToLinkeableMorph extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        if (!Schema::hasColumn('linkeable_rules', 'linkeable_type')) {
            Schema::table('linkeable_rules', function (Blueprint $table) {
                $table->string('linkeable_type', 50)->index()->after('link_id');
                $table->renameColumn('link_id', 'linkeable_id');
            });
        }

        if (!Schema::hasColumn('link_clicks', 'linkeable_type')) {
            Schema::table('link_clicks', function (Blueprint $table) {
                $table->renameColumn('link_id', 'linkeable_id');
                $table->string('linkeable_type', 50)->index();
                $table->integer('owner_id')->unsigned()->nullable();

                $table->index(
                    [
                        'workspace_id',
                        'event_type',
                        'crawler',
                        'linkeable_type',
                        'linkeable_id',
                        'created_at',
                        'platform',
                    ],
                    'platform_index',
                );
                $table->index(
                    [
                        'workspace_id',
                        'event_type',
                        'crawler',
                        'linkeable_type',
                        'linkeable_id',
                        'created_at',
                        'device',
                    ],
                    'device_index',
                );
                $table->index(
                    [
                        'workspace_id',
                        'event_type',
                        'crawler',
                        'linkeable_type',
                        'linkeable_id',
                        'created_at',
                        'browser',
                    ],
                    'browser_index',
                );
                $table->index(
                    [
                        'workspace_id',
                        'event_type',
                        'crawler',
                        'linkeable_type',
                        'linkeable_id',
                        'created_at',
                        'location',
                    ],
                    'location_index',
                );
                $table->index(
                    [
                        'workspace_id',
                        'event_type',
                        'crawler',
                        'linkeable_type',
                        'linkeable_id',
                        'created_at',
                        'referrer',
                    ],
                    'referrer_index',
                );
            });
        }

        if (!Schema::hasColumn('link_tracking_pixel', 'linkeable_type')) {
            Schema::table('link_tracking_pixel', function (Blueprint $table) {
                $table->renameColumn('link_id', 'linkeable_id');
                $table->string('linkeable_type', 50)->index();

                $table->dropIndex('link_pixel_unique');
                $table->unique(
                    ['linkeable_id', 'linkeable_type', 'tracking_pixel_id'],
                    'linkeable_pixel_unique',
                );
            });
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        //
    }
}
