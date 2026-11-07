<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

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
            // Leave existing reserved/failed default as zero, but represent
            // UNKNOWN per-request aggregate charges as NULL, never $0.
            $table->unsignedBigInteger('charged_microusd')->nullable()->default(0)->change();
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
        // Existing per-request history has non-null charges. Map only the
        // aggregate-unknown NULL back to legacy 0 during an explicit rollback.
        DB::table('creator_ai_generation_attempts')
            ->whereNull('charged_microusd')->update(['charged_microusd' => 0]);
        Schema::table('creator_ai_generation_attempts', function (Blueprint $table): void {
            $table->unsignedBigInteger('charged_microusd')->default(0)->change();
        });
        Schema::dropIfExists('creator_ai_provider_cost_windows');
    }
};
