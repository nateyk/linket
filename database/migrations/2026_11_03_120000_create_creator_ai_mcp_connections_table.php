<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Consent metadata only. OAuth access/refresh tokens and private
        // client secrets must never be stored in this table.
        Schema::create('creator_ai_mcp_connections', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->unsignedInteger('creator_id');
            $table->unsignedBigInteger('workspace_id');
            $table->string('oauth_client_id', 191);
            $table->string('status', 16)->default('active');
            $table->dateTime('consented_at');
            $table->dateTime('expires_at');
            $table->dateTime('revoked_at')->nullable();
            $table->dateTime('last_accessed_at')->nullable();
            $table->timestamps();

            $table->index(['creator_id', 'status'], 'creator_ai_mcp_owner_status_idx');
            $table->index(
                ['creator_id', 'workspace_id', 'oauth_client_id'],
                'creator_ai_mcp_owner_workspace_client_idx'
            );
            $table->foreign('creator_id')->references('id')->on('users')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('creator_ai_mcp_connections');
    }
};
