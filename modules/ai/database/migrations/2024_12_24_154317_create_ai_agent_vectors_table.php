<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('ai_agent_vectors')) {
            return;
        }

        Schema::create('ai_agent_vectors', function (Blueprint $table) {
            $table->id();
            $table->string('content_hash', 32)->index()->unique();
            $table->integer('vector_tokens_used')->nullable()->index();
            $table->binary('vector');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_agent_vectors');
    }
};
