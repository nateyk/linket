<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('creator_ai_forecast_checkpoint_streams', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('workspace_id')->constrained()->restrictOnDelete();
            $table->string('source_kind', 40);
            $table->unsignedBigInteger('last_sequence')->default(0);
            $table->char('last_event_digest', 64)->default(str_repeat('0', 64));
            $table->date('last_observed_on')->nullable();
            $table->timestamps();
            $table->unique(['workspace_id', 'source_kind'], 'ai_fc_stream_workspace_source_uq');
        });

        Schema::create('creator_ai_forecast_checkpoint_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('stream_id')
                ->constrained('creator_ai_forecast_checkpoint_streams')->restrictOnDelete();
            $table->foreignId('workspace_id')->constrained()->restrictOnDelete();
            $table->string('source_kind', 40);
            $table->string('source_event_id', 80);
            $table->unsignedBigInteger('sequence');
            $table->date('observed_on');
            $table->unsignedInteger('revision');
            $table->char('previous_digest', 64);
            $table->char('supersedes_digest', 64)->nullable();
            $table->char('event_digest', 64);
            $table->string('key_id', 32);
            $table->char('signature_hmac_sha256', 64);
            $table->unsignedInteger('verified_sales_count');
            $table->unsignedBigInteger('verified_gross_cents');
            $table->timestamp('source_watermark_at');
            $table->timestamp('source_signed_at');
            $table->timestamp('captured_at');
            $table->string('backfill_reason', 32)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->unique(['stream_id', 'sequence'], 'ai_fc_event_stream_sequence_uq');
            $table->unique(['stream_id', 'source_event_id'], 'ai_fc_event_stream_event_id_uq');
            $table->index(['workspace_id', 'observed_on'], 'ai_fc_event_workspace_day_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('creator_ai_forecast_checkpoint_events');
        Schema::dropIfExists('creator_ai_forecast_checkpoint_streams');
    }
};
