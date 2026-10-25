<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('ai_agent_documents')) {
            return;
        }

        Schema::create('ai_agent_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('file_entry_id')->index();
            $table->string('content_hash', 32)->index()->unique()->nullable();
            $table->string('language', 10)->default('en')->index();
            $table->boolean('scan_pending')->default(true)->index();
            $table->boolean('scan_failed')->default(false)->index();
            $table->longText('markdown')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_agent_documents');
    }
};
