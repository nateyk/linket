<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddThemeAndImageColumnsToLinkOverlaysTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('link_overlays', function (Blueprint $table) {
            $table->string('theme', 20)->index()->default('default');
            $table->string('image', 20)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('link_overlays', function (Blueprint $table) {
            $table->dropColumn('theme');
            $table->dropColumn('image');
        });
    }
}
