<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('blog_articles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('blog_category_id')
                ->constrained('blog_categories')
                ->cascadeOnDelete();
            // users.id is `increments` (INT UNSIGNED), not bigIncrements, so
            // this must be unsignedInteger to form a valid foreign key.
            $table->unsignedInteger('author_id')->nullable();
            $table
                ->foreign('author_id')
                ->references('id')
                ->on('users')
                ->nullOnDelete();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('excerpt')->nullable();
            $table->longText('body');
            $table->longText('body_text')->nullable();
            $table->string('cover_image')->nullable();
            $table->string('meta_title')->nullable();
            $table->string('meta_description')->nullable();
            $table->enum('status', ['draft', 'published'])->default(
                'draft',
            );
            $table->timestamp('published_at')->nullable();
            $table->unsignedSmallInteger('reading_time_minutes')->default(1);
            $table->unsignedBigInteger('views')->default(0);
            $table->timestamps();

            $table->index(['status', 'published_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blog_articles');
    }
};