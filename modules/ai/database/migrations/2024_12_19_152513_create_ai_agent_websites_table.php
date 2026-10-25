<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('ai_agent_websites')) {
            return;
        }

        Schema::create('ai_agent_websites', function (Blueprint $table) {
            $table->id();
            $table->text('url');
            $table->string('url_hash', 32)->index()->unique();
            $table->text('title');
            $table->string('scan_type');
            $table->text('scrape_config')->nullable();
            $table->boolean('scan_pending')->default(false)->index();
            $table->integer('scan_version')->default(0)->index();
            $table->string('language')->index()->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_agent_websites');
    }
};
