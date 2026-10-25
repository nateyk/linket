<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('ai_agent_session_tool_response')) {
            return;
        }

        Schema::create('ai_agent_session_tool_response', function (
            Blueprint $table,
        ) {
            $table->id();
            $table->integer('tool_response_id')->index();
            $table->integer('ai_agent_session_id')->index();
            $table->string('flow_node_id', 40)->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_agent_session_tool_response');
    }
};
