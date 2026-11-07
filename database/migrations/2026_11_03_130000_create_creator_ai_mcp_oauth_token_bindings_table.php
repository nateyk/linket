<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Store Passport token IDENTIFIERS only. No bearer/refresh strings.
        // A token maps to exactly one creator's explicit workspace grant.
        Schema::create('creator_ai_mcp_oauth_token_bindings', function (Blueprint $table): void {
            $table->char('access_token_id', 80)->primary();
            $table->uuid('connection_id');
            $table->unsignedInteger('creator_id');
            $table->uuid('oauth_client_id');
            $table->string('resource', 2048);
            $table->timestamps();

            $table->index(['connection_id', 'creator_id'], 'creator_ai_mcp_token_grant_owner_idx');
            $table->foreign('connection_id', 'creator_ai_mcp_token_grant_fk')
                ->references('id')->on('creator_ai_mcp_connections')->cascadeOnDelete();
            $table->foreign('creator_id', 'creator_ai_mcp_token_creator_fk')
                ->references('id')->on('users')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('creator_ai_mcp_oauth_token_bindings');
    }
};
