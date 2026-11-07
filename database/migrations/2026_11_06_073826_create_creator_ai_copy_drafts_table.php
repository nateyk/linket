<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('creator_ai_copy_drafts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedInteger('creator_id');
            $table->foreign('creator_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
            $table->foreignId('digital_product_id')->constrained()->cascadeOnDelete();
            $table->char('source_fingerprint', 64);
            $table->string('state', 20)->default('proposed');
            $table->unsignedInteger('version')->default(0);
            $table->text('encrypted_content');
            $table->timestamp('expires_at');
            $table->unsignedBigInteger('applied_product_revision')->nullable();
            $table->char('applied_payload_hash', 64)->nullable();
            $table->index(['digital_product_id', 'creator_id', 'state'], 'copy_drafts_owner_state');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('creator_ai_copy_drafts');
    }
};
