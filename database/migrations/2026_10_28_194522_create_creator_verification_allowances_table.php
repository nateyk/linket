<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('creator_verification_allowances', function (Blueprint $table): void {
            $table->id();
            $table->unsignedInteger('creator_id');
            $table->foreign('creator_id')->references('id')->on('users')->restrictOnDelete();
            $table->foreignId('storefront_order_id')->unique()->constrained('storefront_orders')->restrictOnDelete();
            $table->string('status', 24)->default('reserved');
            $table->timestamp('consumed_at')->nullable();
            $table->timestamp('released_at')->nullable();
            $table->string('release_reason')->nullable();
            $table->timestamps();
            $table->index(['creator_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('creator_verification_allowances');
    }
};
