<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('ai_agents')) {
            Schema::create('ai_agents', function (Blueprint $table) {
                $table->id();
                $table->string('name')->nullable();
                $table->boolean('enabled')->default(true);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('ai_agentables')) {
            Schema::create('ai_agentables', function (Blueprint $table) {
                $table->id();
                $table->foreignId('ai_agent_id')->constrained('ai_agents')->cascadeOnDelete();
                $table->morphs('ai_agentable');
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_agentables');
        Schema::dropIfExists('ai_agents');
    }
};
