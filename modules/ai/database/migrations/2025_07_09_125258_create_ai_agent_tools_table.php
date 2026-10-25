<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('ai_agent_tools')) {
            return;
        }

        Schema::create('ai_agent_tools', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('type', 20)->nullable()->index();
            $table->boolean('active')->default(false);
            $table->integer('activation_count')->default(0)->index();
            $table->boolean('allow_direct_use')->default(true)->index();
            $table->text('description');
            $table->longText('config')->nullable();
            $table->longText('response_schema')->nullable();
            $table->timestamps();
        });
    }
};
