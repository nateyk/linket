<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // 1) Extend digital_products with course type (additive, nullable-safe default)
        if (!Schema::hasColumn('digital_products', 'type')) {
            Schema::table('digital_products', function (Blueprint $table): void {
                $table->string('type', 20)->default('digital')->after('currency')->index();
            });
        }

        // 2) Allow orders to link to authenticated buyer for enrollments
        if (!Schema::hasColumn('storefront_orders', 'buyer_user_id')) {
            Schema::table('storefront_orders', function (Blueprint $table): void {
                $table->unsignedInteger('buyer_user_id')->nullable()->after('creator_id')->index();
                $table->foreign('buyer_user_id')->references('id')->on('users')->nullOnDelete();
            });
        }

        // 3) Courses (1:1 with digital_products)
        if (!Schema::hasTable('courses')) {
            Schema::create('courses', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('digital_product_id')->unique()->constrained('digital_products')->cascadeOnDelete();
                $table->boolean('require_sequential_completion')->default(false);
                $table->unsignedInteger('instructor_user_id')->nullable();
                $table->timestamp('published_at')->nullable()->index();
                $table->timestamps();
                $table->foreign('instructor_user_id')->references('id')->on('users')->nullOnDelete();
            });
        }

        // 4) Chapters
        if (!Schema::hasTable('course_chapters')) {
            Schema::create('course_chapters', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('course_id')->constrained('courses')->cascadeOnDelete();
                $table->string('title', 160);
                $table->integer('sort_order')->default(0);
                $table->timestamps();
                $table->index(['course_id', 'sort_order']);
            });
        }

        // 5) Lessons
        if (!Schema::hasTable('course_lessons')) {
            Schema::create('course_lessons', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('chapter_id')->constrained('course_chapters')->cascadeOnDelete();
                $table->foreignId('course_id')->constrained('courses')->cascadeOnDelete();
                $table->string('title', 160);
                $table->longText('content')->nullable();
                $table->string('video_type', 20)->nullable()->comment('upload|external');
                $table->unsignedInteger('video_file_entry_id')->nullable();
                $table->string('video_url', 1024)->nullable();
                $table->integer('duration_seconds')->nullable();
                $table->string('status', 20)->default('draft')->index()->comment('draft|published');
                $table->integer('sort_order')->default(0);
                $table->timestamps();
                $table->foreign('video_file_entry_id')->references('id')->on('file_entries')->nullOnDelete();
                $table->index(['course_id', 'chapter_id', 'sort_order']);
                $table->index(['chapter_id', 'sort_order']);
            });
        }

        // 6) Lesson resources
        if (!Schema::hasTable('course_lesson_resources')) {
            Schema::create('course_lesson_resources', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('lesson_id')->constrained('course_lessons')->cascadeOnDelete();
                $table->unsignedInteger('file_entry_id');
                $table->string('display_name', 255);
                $table->unsignedBigInteger('size')->default(0);
                $table->string('mime', 100)->nullable();
                $table->integer('sort_order')->default(0);
                $table->timestamps();
                $table->foreign('file_entry_id')->references('id')->on('file_entries')->restrictOnDelete();
                $table->index(['lesson_id', 'sort_order']);
            });
        }

        // 7) Enrollments (one per user+course)
        if (!Schema::hasTable('course_enrollments')) {
            Schema::create('course_enrollments', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('course_id')->constrained('courses')->cascadeOnDelete();
                $table->unsignedInteger('user_id');
                $table->foreignId('storefront_order_id')->nullable()->constrained('storefront_orders')->nullOnDelete();
                $table->string('status', 20)->default('active')->index()->comment('active|revoked');
                $table->timestamp('enrolled_at')->useCurrent();
                $table->timestamp('completed_at')->nullable();
                $table->timestamps();
                $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
                $table->unique(['user_id', 'course_id']);
                $table->index(['course_id', 'status']);
            });
        }

        // 8) Lesson progress (one per user+lesson)
        if (!Schema::hasTable('course_lesson_progress')) {
            Schema::create('course_lesson_progress', function (Blueprint $table): void {
                $table->id();
                $table->unsignedInteger('user_id');
                $table->foreignId('course_id')->constrained('courses')->cascadeOnDelete();
                $table->foreignId('lesson_id')->constrained('course_lessons')->cascadeOnDelete();
                $table->timestamp('completed_at')->useCurrent();
                $table->timestamps();
                $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
                $table->unique(['user_id', 'lesson_id']);
                $table->index(['user_id', 'course_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('course_lesson_progress');
        Schema::dropIfExists('course_enrollments');
        Schema::dropIfExists('course_lesson_resources');
        Schema::dropIfExists('course_lessons');
        Schema::dropIfExists('course_chapters');
        Schema::dropIfExists('courses');

        if (Schema::hasColumn('storefront_orders', 'buyer_user_id')) {
            Schema::table('storefront_orders', function (Blueprint $table): void {
                // drop FK first if exists
                try { $table->dropForeign(['buyer_user_id']); } catch (\Throwable $e) {}
                $table->dropColumn('buyer_user_id');
            });
        }

        if (Schema::hasColumn('digital_products', 'type')) {
            Schema::table('digital_products', function (Blueprint $table): void {
                $table->dropIndex(['type']);
                $table->dropColumn('type');
            });
        }
    }
};
