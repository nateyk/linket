<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 2 schema (greenfield): BeDesk canned_replies + triggers final shape.
 */
return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('canned_replies')) {
            Schema::create('canned_replies', function (Blueprint $table) {
                $table->id();
                $table->string('name')->index();
                $table->boolean('shared')->default(false);
                $table->unsignedBigInteger('group_id')->nullable()->index();
                $table->unsignedBigInteger('user_id')->index();
                $table->text('body');
                $table->timestamps();

                $table->unique(['name', 'user_id']);
            });
        }

        if (! Schema::hasTable('triggers')) {
            Schema::create('triggers', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->text('description')->nullable();
                $table->unsignedInteger('times_fired')->default(0);
                $table->json('config')->nullable();
                $table->unsignedBigInteger('user_id')->nullable()->index();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('canned_replies');
        Schema::dropIfExists('triggers');
    }
};
