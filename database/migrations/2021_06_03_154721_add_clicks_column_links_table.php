<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddClicksColumnLinksTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        if (Schema::hasColumn('links', 'clicks_count')) return;

        Schema::table('links', function (Blueprint $table) {
            $table->timestamp('clicked_at')->index()->nullable();
            $table->bigInteger('clicks_count')->unsigned()->default(0)->index();
            $table->timestamp('activates_at')->nullable()->index();
        });
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
