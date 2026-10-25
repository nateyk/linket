<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('ai_agent_chunks')) {
            return;
        }

        Schema::create('ai_agent_chunks', function (Blueprint $table) {
            $table->id();
            $table->string('content_hash', 32)->index();
            $table->integer('parent_chunk_id')->nullable()->index();
            $table->integer('chunkable_id')->index();
            $table->string('chunkable_type', 50)->index();
            $table->integer('vector_id')->index()->nullable();
            $table->longText('content');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_agent_chunks');
    }
};
