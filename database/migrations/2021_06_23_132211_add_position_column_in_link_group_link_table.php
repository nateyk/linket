<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddPositionColumnInLinkGroupLinkTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        if (Schema::hasTable('link_group_link')) {
            Schema::table('link_group_link', function (Blueprint $table) {
                $table->integer('position')->unsigned()->default(0)->index();
                $table->string('animation', 40)->nullable();
                $table->timestamp('leap_until')->nullable();
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
