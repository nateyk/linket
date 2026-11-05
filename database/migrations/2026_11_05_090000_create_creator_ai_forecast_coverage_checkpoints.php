<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Storage contract only. No producer or public import endpoint; this table
 * cannot prove a zero-sale day was observed or make a forecast publishable.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('creator_ai_forecast_coverage_checkpoints', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('workspace_id')->constrained()->restrictOnDelete();
            $table->date('observed_on');
            $table->string('source_kind', 40);
            $table->unsignedInteger('verified_sales_count');
            $table->unsignedBigInteger('verified_gross_cents');
            // Cursor fingerprint, NOT a signature or independent attestation.
            $table->char('source_cursor_sha256', 64)->nullable();
            $table->timestamp('source_watermark_at')->nullable();
            $table->timestamp('captured_at')->nullable();
            $table->timestamp('sealed_at')->nullable();
            $table->timestamps();

            $table->unique(
                ['workspace_id', 'observed_on', 'source_kind'],
                'ai_forecast_checkpoint_workspace_day_source_uq'
            );
            $table->index(['workspace_id', 'observed_on'], 'ai_forecast_checkpoint_lookup_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('creator_ai_forecast_coverage_checkpoints');
    }
};
