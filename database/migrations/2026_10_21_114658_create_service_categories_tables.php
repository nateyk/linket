<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->string('slug', 140)->unique();
            $table->text('description')->nullable();
            $table->boolean('featured')->default(false);
            $table->boolean('add_to_menu')->default(false);
            $table->string('status', 20)->default('active');
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });

        Schema::create('service_subcategories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_category_id')
                ->constrained('service_categories')
                ->cascadeOnDelete();
            $table->string('name', 120);
            $table->string('slug', 140);
            $table->text('description')->nullable();
            $table->boolean('featured')->default(false);
            $table->boolean('add_to_menu')->default(false);
            $table->string('status', 20)->default('active');
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();

            $table->unique(['service_category_id', 'slug']);
        });

        Schema::table('creator_services', function (Blueprint $table) {
            $table->foreignId('service_category_id')
                ->nullable()
                ->after('category')
                ->constrained('service_categories')
                ->nullOnDelete();
            $table->foreignId('service_subcategory_id')
                ->nullable()
                ->after('service_category_id')
                ->constrained('service_subcategories')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('creator_services', function (Blueprint $table) {
            $table->dropConstrainedForeignId('service_subcategory_id');
            $table->dropConstrainedForeignId('service_category_id');
        });

        Schema::dropIfExists('service_subcategories');
        Schema::dropIfExists('service_categories');
    }
};
