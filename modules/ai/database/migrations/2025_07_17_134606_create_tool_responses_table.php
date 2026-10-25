<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('tool_responses', function (Blueprint $table) {
            $table->id();
            $table->string('type', 20)->index()->default('live');
            $table->string('request_key')->index();
            $table->integer('tool_id')->index();
            $table->longText('response');
            $table->timestamp('created_at')->useCurrent()->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tool_responses');
    }
};
