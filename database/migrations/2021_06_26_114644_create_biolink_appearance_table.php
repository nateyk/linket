<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateBiolinkAppearanceTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        if (Schema::hasTable('biolink_appearances')) return;
        Schema::create('biolink_appearances', function (Blueprint $table) {
            $table->id();
            $table->bigInteger('biolink_id')->unsigned()->index();
            $table->longText('config');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('biolink_appearances');
    }
}
