<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * BeDesk Help Center tables (articles/categories). Distinct from Linket help_* KB.
 */
return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('articles')) {
            Schema::create('articles', function (Blueprint $table) {
                $table->id();
                $table->string('title')->index();
                $table->mediumText('body');
                $table->string('slug')->nullable()->index();
                $table->boolean('draft')->default(false)->index();
                $table->string('visibility')->default('public')->index();
                $table->unsignedInteger('views')->default(0)->index();
                $table->text('description')->nullable();
                $table->string('managed_by_role')->nullable();
                $table->string('visible_to_role')->nullable();
                $table->unsignedBigInteger('author_id')->nullable()->index();
                $table->boolean('scan_pending')->default(false);
                $table->timestamp('scan_started_at')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('categories')) {
            Schema::create('categories', function (Blueprint $table) {
                $table->id();
                $table->string('name')->index();
                $table->string('image')->nullable();
                $table->text('description')->nullable();
                $table->smallInteger('position')->default(0)->index();
                $table->unsignedBigInteger('parent_id')->nullable()->index();
                $table->string('managed_by_role')->nullable();
                $table->string('visible_to_role')->nullable();
                $table->boolean('hide_from_structure')->default(false);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('category_article')) {
            Schema::create('category_article', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('article_id')->index();
                $table->unsignedBigInteger('category_id')->index();
                $table->integer('position')->default(0)->index();
                $table->unique(['article_id', 'category_id']);
            });
        }

        if (! Schema::hasTable('article_feedback')) {
            Schema::create('article_feedback', function (Blueprint $table) {
                $table->id();
                $table->boolean('was_helpful')->nullable();
                $table->text('comment')->nullable();
                $table->unsignedBigInteger('article_id')->index();
                $table->unsignedBigInteger('user_id')->nullable()->index();
                $table->string('ip', 45)->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('search_terms')) {
            Schema::create('search_terms', function (Blueprint $table) {
                $table->id();
                $table->string('term')->index();
                $table->unsignedBigInteger('user_id')->nullable()->index();
                $table->unsignedInteger('count')->default(1);
                $table->string('type', 40)->nullable()->index();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('search_terms');
        Schema::dropIfExists('article_feedback');
        Schema::dropIfExists('category_article');
        Schema::dropIfExists('categories');
        Schema::dropIfExists('articles');
    }
};
