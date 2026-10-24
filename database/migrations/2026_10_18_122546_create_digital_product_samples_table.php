<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('digital_product_samples', function (Blueprint $table) {
            $table->id();
            $table->foreignId('digital_product_id')->constrained('digital_products')->cascadeOnDelete();
            // file_entries.id is an unsigned integer, not a bigint.
            $table->unsignedInteger('file_entry_id');
            $table->foreign('file_entry_id')->references('id')->on('file_entries')->cascadeOnDelete();
            $table->string('kind', 16);
            $table->string('title')->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->unsignedInteger('duration_ms')->nullable();
            $table->boolean('is_free_preview')->default(true);
            $table->timestamps();

            $table->unique(['digital_product_id', 'file_entry_id'], 'digital_product_samples_product_file_unique');
            $table->index(['digital_product_id', 'position'], 'digital_product_samples_product_position_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('digital_product_samples');
    }
};
