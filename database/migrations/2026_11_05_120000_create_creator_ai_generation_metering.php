<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('creator_ai_generation_metering', function (Blueprint $table): void {
            $table->uuid('request_id')->primary();
            $table->string('provider_model', 80);
            $table->unsignedInteger('input_tokens');
            $table->unsignedInteger('output_tokens');
            $table->unsignedInteger('cached_input_tokens')->default(0);
            $table->unsignedInteger('reasoning_tokens')->default(0);
            $table->timestamps();
            $table->foreign('request_id', 'creator_ai_metering_attempt_fk')
                ->references('request_id')->on('creator_ai_generation_attempts')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('creator_ai_generation_metering');
    }
};
