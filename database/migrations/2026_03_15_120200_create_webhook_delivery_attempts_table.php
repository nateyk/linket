<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('webhook_delivery_attempts')) {
            return;
        }

        Schema::create('webhook_delivery_attempts', function (
            Blueprint $table,
        ) {
            $table->uuid('id')->primary();
            $table->uuid('webhook_id')->index();
            $table->uuid('webhook_delivery_id')->index();
            $table->unsignedInteger('attempt_number');
            $table->integer('response_status')->nullable();
            $table->text('response_body')->nullable();
            $table->unsignedInteger('duration_ms')->default(0);
            $table->timestamps();
        });
    }
};
