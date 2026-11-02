<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('telegram_free_quota_alerts', function (Blueprint $table): void {
            $table->id();
            $table->unsignedInteger('creator_id');
            $table->foreign('creator_id', 'tg_quota_creator_fk')
                ->references('id')->on('users')->cascadeOnDelete();
            $table->foreignId('storefront_order_id')
                ->constrained('storefront_orders')->cascadeOnDelete();
            $table->unsignedInteger('free_limit');
            $table->unsignedInteger('consumed');
            $table->timestamps();
            $table->unique(['creator_id', 'free_limit', 'consumed'], 'tg_quota_once_uq');
        });

        Schema::create('telegram_payment_reviews', function (Blueprint $table): void {
            $table->id();
            $table->unsignedInteger('creator_id');
            $table->foreign('creator_id', 'tg_review_creator_fk')
                ->references('id')->on('users')->cascadeOnDelete();
            $table->foreignId('storefront_order_id')
                ->constrained('storefront_orders')->cascadeOnDelete();
            $table->foreignId('verification_id')->unique('tg_review_once_uq')
                ->constrained('direct_payment_verifications')->cascadeOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('telegram_payment_reviews');
        Schema::dropIfExists('telegram_free_quota_alerts');
    }
};
