<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('ai_agent_webpages')) {
            return;
        }

        Schema::create('ai_agent_webpages', function (Blueprint $table) {
            $table->id();
            $table->integer('ai_agent_website_id')->index();
            $table->string('url_hash', 32)->index()->unique();
            $table->string('content_hash', 32)->index()->unique()->nullable();
            $table->text('url');
            $table->text('title')->nullable();
            $table->boolean('fully_scanned')->default(false)->index();
            $table->boolean('scan_pending')->default(true)->index();
            $table
                ->integer('last_full_scan_version')
                ->unsigned()
                ->default(0)
                ->index();
            $table->integer('scan_version')->unsigned()->default(0)->index();
            $table->integer('scan_tries')->default(0);
            $table->longText('markdown')->nullable();
            $table->timestamp('scan_started_at')->nullable()->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_agent_webpages');
    }
};
