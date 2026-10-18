<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        $storeTable = config('stores.table_rename_done') || config('store.table_rename_done')
            ? 'stores'
            : 'biolinks';

        if (!Schema::hasTable('creator_services')) {
            Schema::create('creator_services', function (Blueprint $table) use ($storeTable): void {
                $table->id();
                $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
                $table->unsignedInteger('user_id');
                $table->foreignId('store_id')->constrained($storeTable)->cascadeOnDelete();
                $table->string('title', 160);
                $table->string('slug', 180)->unique();
                $table->string('short_description', 240)->nullable();
                $table->text('description')->nullable();
                $table->string('category', 80)->nullable();
                $table->json('skills')->nullable();
                $table->unsignedInteger('cover_file_entry_id')->nullable();
                $table->string('video_url', 500)->nullable();
                $table->string('live_demo_url', 500)->nullable();
                $table->json('contact_channels')->nullable();
                $table->string('currency', 12)->default('ETB');
                $table->string('status', 20)->default('draft')->index();
                $table->timestamps();
                $table->softDeletes();

                $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
                $table->foreign('cover_file_entry_id')->references('id')->on('file_entries')->nullOnDelete();
                $table->index(['workspace_id', 'user_id']);
                $table->index('store_id');
            });
        }

        if (!Schema::hasTable('creator_service_images')) {
            Schema::create('creator_service_images', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('creator_service_id')->constrained('creator_services')->cascadeOnDelete();
                $table->unsignedInteger('file_entry_id');
                $table->unsignedInteger('position')->default(0);
                $table->timestamps();

                $table->unique(['creator_service_id', 'file_entry_id']);
                $table->foreign('file_entry_id')->references('id')->on('file_entries')->cascadeOnDelete();
            });
        }

        if (!Schema::hasTable('creator_service_packages')) {
            Schema::create('creator_service_packages', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('creator_service_id')->constrained('creator_services')->cascadeOnDelete();
                $table->string('name', 80);
                $table->text('description')->nullable();
                $table->unsignedBigInteger('price_cents')->nullable();
                $table->string('currency', 12)->default('ETB');
                $table->unsignedSmallInteger('delivery_days')->nullable();
                $table->unsignedSmallInteger('revisions')->nullable();
                $table->json('features')->nullable();
                $table->unsignedInteger('position')->default(0);
                $table->timestamps();

                $table->index(['creator_service_id', 'position']);
            });
        }

        if (!Schema::hasTable('creator_service_faqs')) {
            Schema::create('creator_service_faqs', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('creator_service_id')->constrained('creator_services')->cascadeOnDelete();
                $table->string('question', 240);
                $table->text('answer');
                $table->unsignedInteger('position')->default(0);
                $table->timestamps();

                $table->index(['creator_service_id', 'position']);
            });
        }

        if (!Schema::hasTable('creator_service_inquiries')) {
            Schema::create('creator_service_inquiries', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('creator_service_id')->constrained('creator_services')->cascadeOnDelete();
                $table->foreignId('creator_service_package_id')
                    ->nullable()
                    ->constrained('creator_service_packages')
                    ->nullOnDelete();
                $table->string('name', 120);
                $table->string('email', 180);
                $table->string('phone', 40)->nullable();
                $table->text('message');
                $table->string('status', 20)->default('new')->index();
                $table->timestamp('read_at')->nullable();
                $table->timestamps();

                $table->index(['creator_service_id', 'created_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('creator_service_inquiries');
        Schema::dropIfExists('creator_service_faqs');
        Schema::dropIfExists('creator_service_packages');
        Schema::dropIfExists('creator_service_images');
        Schema::dropIfExists('creator_services');
    }
};
