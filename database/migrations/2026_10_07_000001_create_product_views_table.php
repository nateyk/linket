<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_views', function (Blueprint $table) {
            $table->id();
            $table->foreignId('digital_product_id')->constrained('digital_products')->cascadeOnDelete();
            $table->char('ip_hash', 64)->index();
            $table->char('country', 2)->nullable()->index();
            $table->string('referrer', 255)->nullable();
            $table->timestamp('created_at')->nullable();
            $table->index(['digital_product_id', 'created_at'], 'pv_product_created_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_views');
    }
};