<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateBiolinkWidgetsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        if (Schema::hasTable('biolink_widgets')) return;
        Schema::create('biolink_widgets', function (Blueprint $table) {
            $table->id();
            $table->bigInteger('biolink_id')->unsigned()->index();
            $table->string('type', 50);
            $table->boolean('active')->default(true);
            $table->integer('position')->unsigned()->default(0);
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
        Schema::dropIfExists('biolink_widgets');
    }
}
