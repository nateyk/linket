<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('telegram_connections', function (Blueprint $table): void {
            $table->id();
            $table->unsignedInteger('user_id')->unique();
            $table->bigInteger('telegram_user_id')->unique();
            $table->bigInteger('telegram_chat_id')->unique();
            $table->string('telegram_username')->nullable();
            $table->string('language_code', 16)->nullable();
            $table->timestamp('connected_at');
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();

            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->cascadeOnDelete();
        });

        Schema::create('telegram_link_tokens', function (Blueprint $table): void {
            $table->id();
            $table->unsignedInteger('user_id');
            $table->char('token_hash', 64)->unique();
            $table->timestamp('expires_at');
            $table->timestamp('consumed_at')->nullable();
            $table->timestamps();

            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->cascadeOnDelete();
            $table->index(['user_id', 'expires_at']);
        });

        Schema::create('telegram_webhook_updates', function (Blueprint $table): void {
            $table->unsignedBigInteger('update_id')->primary();
            $table->timestamp('processed_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('telegram_webhook_updates');
        Schema::dropIfExists('telegram_link_tokens');
        Schema::dropIfExists('telegram_connections');
    }
};
