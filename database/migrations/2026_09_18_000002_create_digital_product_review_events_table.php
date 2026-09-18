<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('digital_product_review_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('digital_product_id')->constrained('digital_products')->cascadeOnDelete();
            $table->unsignedInteger('actor_id')->nullable();
            $table->foreign('actor_id')->references('id')->on('users')->nullOnDelete();
            $table->string('actor_role', 20);
            $table->string('event', 40)->index();
            $table->string('from_status')->nullable();
            $table->string('to_status')->nullable();
            $table->text('reason')->nullable();
            $table->json('meta')->nullable();
            $table->timestamp('created_at')->nullable();
            $table->index(['digital_product_id', 'created_at'], 'dpre_product_created_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('digital_product_review_events');
    }
};
