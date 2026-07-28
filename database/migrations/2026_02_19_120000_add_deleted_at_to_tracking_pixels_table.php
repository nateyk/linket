<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddDeletedAtToTrackingPixelsTable extends Migration
{
    public function up()
    {
        Schema::table('tracking_pixels', function (Blueprint $table) {
            $table->softDeletes()->index();
        });

        Schema::table('link_overlays', function (Blueprint $table) {
            $table->softDeletes()->index();
        });
    }

    public function down()
    {
        Schema::table('tracking_pixels', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        Schema::table('link_overlays', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
}
