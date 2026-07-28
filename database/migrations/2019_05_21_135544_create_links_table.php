<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateLinksTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('links', function (Blueprint $table) {
            $table->increments('id');
            $table->string('title', 150)->nullable();
            $table->string('back_half', 10)->index();
            $table->text('long_url');
            $table->integer('user_id')->index();
            $table->integer('domain_id')->index()->nullable();
            $table->string('password')->nullable()->index();
            $table->timestamp('expires_at')->nullable()->index();
            $table->text('description')->nullable();
            $table->string('type', 30)->index();
            $table->integer('type_id')->index()->nullable();
            $table->timestamp('created_at')->index()->nullable();
            $table->timestamp('updated_at')->index()->nullable();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('links');
    }
}
