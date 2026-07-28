<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('webhooks')) {
            return;
        }

        Schema::create('webhooks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->integer('user_id')->index();
            $table->string('name');
            $table->text('url');
            $table->string('signing_secret', 64);
            $table->json('selected_events');
            $table->unsignedInteger('consecutive_failures')->default(0);
            $table->softDeletes();
            $table->timestamps();
        });
    }
};
