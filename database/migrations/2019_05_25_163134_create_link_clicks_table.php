<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateLinkClicksTable extends Migration
{
    public function up()
    {
        Schema::create('link_clicks', function (Blueprint $table) {
            $table->increments('id');
            $table->integer('link_id')->index();
            $table->string('platform', 30)->nullable();
            $table->string('device', 30)->nullable();
            $table->string('browser', 30)->nullable();
            $table->string('location', 5)->nullable();
            $table->boolean('crawler')->default(0);
            $table->string('referrer')->nullable();
            $table->string('ip')->nullable();
            $table->string('event_type', 20)->default('click')->index();
            $table->integer('workspace_id')->unsigned()->nullable();
            $table->timestamp('created_at');
        });
    }

    public function down()
    {
        Schema::dropIfExists('link_clicks');
    }
}
