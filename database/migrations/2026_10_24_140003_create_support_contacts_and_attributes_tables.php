<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('emails')) {
            Schema::create('emails', function (Blueprint $table) {
                $table->id();
                $table->string('address')->index();
                $table->unsignedBigInteger('user_id')->index();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('user_details')) {
            Schema::create('user_details', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id')->unique();
                $table->text('notes')->nullable();
                $table->json('details')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('page_visits')) {
            Schema::create('page_visits', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id')->index();
                $table->text('url');
                $table->text('title');
                $table->text('referrer')->nullable();
                $table->string('session_id', 36)->index();
                $table->timestamp('created_at')->nullable();
                $table->timestamp('ended_at')->nullable();
            });
        }

        if (! Schema::hasTable('attributes')) {
            Schema::create('attributes', function (Blueprint $table) {
                $table->id();
                $table->string('name', 60)->index();
                $table->string('key', 60)->unique();
                $table->string('format', 20);
                $table->boolean('active')->default(true);
                $table->string('type', 20)->default('conversation')->index();
                $table->boolean('internal')->default(false);
                $table->boolean('hide_in_form')->default(false);
                $table->boolean('required')->default(false);
                $table->string('permission');
                $table->string('description')->nullable();
                $table->string('customer_name')->nullable();
                $table->string('customer_description')->nullable();
                $table->boolean('materialized')->default(false);
                $table->longText('config')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('attributables')) {
            Schema::create('attributables', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('attribute_id')->index();
                $table->morphs('attributable');
                $table->text('value')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('attributables');
        Schema::dropIfExists('attributes');
        Schema::dropIfExists('page_visits');
        Schema::dropIfExists('user_details');
        Schema::dropIfExists('emails');
    }
};
