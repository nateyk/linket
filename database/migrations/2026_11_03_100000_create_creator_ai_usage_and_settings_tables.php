<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('creator_ai_settings', function (Blueprint $table): void {
            $table->unsignedTinyInteger('id')->primary();
            $table->longText('encrypted_config');
            $table->timestamps();
        });

        // Encrypt the complete provider/limits document, never store raw keys.
        DB::table('creator_ai_settings')->insert([
            'id' => 1,
            'encrypted_config' => Crypt::encryptString('{}'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Schema::create('creator_ai_usage_months', function (Blueprint $table): void {
            $table->id();
            $table->unsignedInteger('creator_id');
            $table->date('month');
            $table->unsignedInteger('reserved_requests')->default(0);
            $table->unsignedInteger('completed_requests')->default(0);
            $table->timestamps();
            $table->unique(['creator_id', 'month'], 'creator_ai_usage_creator_month_unique');
            $table->foreign('creator_id')->references('id')->on('users')->cascadeOnDelete();
        });

        Schema::create('creator_ai_provider_usage_months', function (Blueprint $table): void {
            $table->id();
            $table->string('provider', 32);
            $table->date('month');
            // 1 USD = 1,000,000 microUSD; keep integer money accounting.
            $table->unsignedBigInteger('reserved_microusd')->default(0);
            $table->unsignedBigInteger('spent_microusd')->default(0);
            $table->timestamps();
            $table->unique(['provider', 'month'], 'creator_ai_provider_month_unique');
        });

        Schema::create('creator_ai_generation_attempts', function (Blueprint $table): void {
            $table->uuid('request_id')->primary();
            $table->unsignedInteger('creator_id');
            $table->unsignedInteger('workspace_id');
            $table->date('month');
            $table->string('feature', 40);
            $table->string('provider', 32);
            $table->string('status', 20)->default('reserved');
            $table->unsignedBigInteger('reserved_microusd');
            $table->unsignedBigInteger('charged_microusd')->default(0);
            $table->timestamps();
            $table->index(['creator_id', 'month', 'status'], 'creator_ai_attempt_creator_status');
            $table->foreign('creator_id')->references('id')->on('users')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('creator_ai_generation_attempts');
        Schema::dropIfExists('creator_ai_provider_usage_months');
        Schema::dropIfExists('creator_ai_usage_months');
        Schema::dropIfExists('creator_ai_settings');
    }
};
