<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('creator_ai_provider_cost_windows', function (Blueprint $table): void {
            $table->id();
            $table->string('provider', 32);
            $table->date('day');
            $table->string('project_id', 120);
            $table->string('generation_api_key_id', 120);
            $table->unsignedBigInteger('cost_microusd');
            $table->unsignedInteger('request_count');
            $table->char('provider_evidence_sha256', 64);
            $table->char('local_attempts_sha256', 64);
            $table->timestamp('first_observed_at');
            $table->timestamp('settled_at')->nullable();
            $table->string('status', 24)->default('observed');
            $table->timestamps();
            $table->unique(['provider', 'day'], 'creator_ai_provider_cost_day_unique');
        });

        Schema::table('creator_ai_generation_attempts', function (Blueprint $table): void {
            // One aggregate day can cover multiple generations, but does NOT
            // attribute any invented cost to a particular request.
            $table->foreignId('cost_window_id')->nullable()
                ->constrained('creator_ai_provider_cost_windows', 'id')
                ->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('creator_ai_generation_attempts', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('cost_window_id');
        });
        Schema::dropIfExists('creator_ai_provider_cost_windows');
    }
};
