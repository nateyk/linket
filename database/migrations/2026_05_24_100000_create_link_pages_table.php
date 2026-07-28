<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('link_pages')) {
            return;
        }

        Schema::create('link_pages', function (Blueprint $table) {
            $table->increments('id');
            $table->string('title');
            $table->longText('body');
            $table->boolean('hide_footer')->default(false);
            $table->boolean('hide_navbar')->default(false);
            $table->integer('user_id')->nullable()->index();
            $table->integer('workspace_id')->unsigned()->nullable()->index();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('link_pages');
    }
};
