<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Link a REAL Passport authorization code ID to one explicitly approved
        // creator/workspace/client/resource grant. Never store the encrypted
        // authorization code, access token or refresh token payload here.
        Schema::create('creator_ai_mcp_oauth_code_bindings', function (Blueprint $table): void {
            $table->string('auth_code_id', 100)->primary();
            $table->uuid('connection_id');
            $table->unsignedInteger('creator_id');
            $table->uuid('oauth_client_id');
            $table->string('resource', 2048);
            $table->string('redirect_uri', 2048);
            $table->char('code_challenge', 43);
            $table->dateTime('expires_at');
            $table->timestamps();

            $table->index(['connection_id', 'creator_id'], 'creator_ai_mcp_code_grant_owner_idx');
            $table->foreign('connection_id', 'creator_ai_mcp_code_grant_fk')
                ->references('id')->on('creator_ai_mcp_connections')->cascadeOnDelete();
            $table->foreign('creator_id', 'creator_ai_mcp_code_creator_fk')
                ->references('id')->on('users')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('creator_ai_mcp_oauth_code_bindings');
    }
};
