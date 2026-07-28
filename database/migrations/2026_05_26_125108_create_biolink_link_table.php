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
        Schema::create('biolink_link', function (Blueprint $table) {
            $table->id();
            $table->integer('biolink_id')->index();
            $table->integer('link_id')->index();
            $table->integer('position')->index();
            $table->boolean('active')->default(0);
            $table->string('animation', 40)->nullable();
            $table->timestamp('leap_until')->nullable();
            $table->timestamps();

            $table->unique(['biolink_id', 'link_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('biolink_link');
    }
};
