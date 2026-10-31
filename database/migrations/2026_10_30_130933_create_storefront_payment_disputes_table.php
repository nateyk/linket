<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('storefront_payment_disputes', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('storefront_order_id')->constrained('storefront_orders')->cascadeOnDelete();
            $table->foreignId('conversation_id')->constrained('conversations')->cascadeOnDelete();
            // users.id is legacy int unsigned (not bigint).
            $table->unsignedInteger('creator_id');
            $table->foreign('creator_id')->references('id')->on('users')->cascadeOnDelete();
            $table->string('reason', 40);
            $table->string('buyer_email_hash', 64)->index();
            $table->timestamps();

            $table->index(['creator_id', 'created_at']);
            $table->index(['storefront_order_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('storefront_payment_disputes');
    }
};
