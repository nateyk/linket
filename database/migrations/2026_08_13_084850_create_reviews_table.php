<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateReviewsTable extends Migration
{
    public function up()
    {
        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->morphs('reviewable');
            $table->unsignedBigInteger('user_id')->nullable();
            $table->text('review')->nullable();
            $table->string('department')->default('default');
            $table->boolean('recommend')->default(false);
            $table->boolean('approved')->default(false);
            $table->foreignId('storefront_order_id')->nullable()->unique()->constrained('storefront_orders')->cascadeOnDelete();
            $table->string('buyer_email', 254)->nullable();
            $table->string('buyer_name', 120)->nullable();
            $table->string('title', 120)->nullable();
            $table->unsignedBigInteger('hidden_by')->nullable();
            $table->string('hidden_reason', 255)->nullable();
            $table->timestamp('hidden_at')->nullable();
            $table->index(['reviewable_id', 'reviewable_type', 'approved', 'created_at']);
            $table->index('buyer_email');
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('reviews');
    }
}

