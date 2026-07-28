<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('biolinks', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->index();
            $table->string('back_half', 50)->index();
            $table->integer('user_id')->index();
            $table->integer('workspace_id')->index();
            $table->integer('domain_id')->index()->nullable();
            $table->string('password', 100)->nullable();
            $table->integer('clicks_count')->default(0);
            $table->text('utm')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('activates_at')->nullable();
            $table->timestamp('clicked_at')->nullable();
            $table->softDeletes();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('biolinks');
    }
};
