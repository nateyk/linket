<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('webhook_deliveries')) {
            return;
        }

        Schema::create('webhook_deliveries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('webhook_id')->index();
            $table->string('event_type');
            $table->string('status', 30)->default('pending')->index();
            $table->json('payload');
            $table->unsignedInteger('attempts_count')->default(0);
            $table->timestamp('last_attempt_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamps();
        });
    }
};
