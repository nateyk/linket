<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('ai_agent_snippets')) {
            return;
        }

        Schema::create('ai_agent_snippets', function (Blueprint $table) {
            $table->id();

            $table->string('title');
            $table->longText('body');

            $table->boolean('used_by_ai_agent')->default(false)->index();
            $table->boolean('scan_pending')->default(false)->index();
            $table->timestamp('scan_started_at')->nullable()->index();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_agent_snippets');
    }
};
