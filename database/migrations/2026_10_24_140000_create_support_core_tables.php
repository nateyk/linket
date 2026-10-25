<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * BeDesk v3 final conversation / team schema (greenfield).
 * Includes support_owner_id for later per-creator tenancy (Phase 5).
 */
return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('groups')) {
            Schema::create('groups', function (Blueprint $table) {
                $table->id();
                $table->string('name', 191);
                $table->string('color', 50)->nullable();
                $table->boolean('default')->nullable();
                $table->string('assignment_mode', 20)->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('group_user')) {
            Schema::create('group_user', function (Blueprint $table) {
                $table->id();
                $table->unsignedInteger('group_id')->index();
                $table->unsignedInteger('user_id')->index();
                $table
                    ->string('conversation_priority', 40)
                    ->nullable()
                    ->default('backup')
                    ->index();
                $table->timestamp('created_at')->nullable()->index();
            });
        }

        if (! Schema::hasTable('conversation_statuses')) {
            Schema::create('conversation_statuses', function (Blueprint $table) {
                $table->id();
                $table->string('label', 100);
                $table->string('user_label', 100)->nullable();
                $table->tinyInteger('category')->default(5)->index();
                $table->boolean('active')->default(true)->index();
                $table->boolean('internal')->default(false)->index();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('conversations')) {
            Schema::create('conversations', function (Blueprint $table) {
                $table->id();
                $table->string('subject', 191)->nullable()->index();
                $table->unsignedBigInteger('user_id')->nullable()->index();
                $table->string('type', 60)->nullable()->default('ticket')->index();
                $table->unsignedBigInteger('closed_by')->nullable()->index();
                $table->unsignedBigInteger('assignee_id')->nullable()->index();
                $table->string('assigned_to', 20)->nullable()->index();
                $table->boolean('ai_agent_involved')->default(false);
                $table->unsignedBigInteger('group_id')->nullable()->index();
                $table->unsignedBigInteger('status_id')->nullable()->index();
                $table->tinyInteger('status_category')->nullable()->index();
                $table->string('priority', 40)->nullable()->index();
                $table->string('channel', 40)->nullable()->index();
                $table->string('mode', 20)->default('normal')->index();
                $table->boolean('rating')->nullable();
                $table->string('received_at_email', 100)->nullable()->index();
                // Platform support when null; creator-owned inbox when set (Phase 5).
                $table->unsignedBigInteger('support_owner_id')->nullable()->index();
                $table->timestamp('assigned_at')->nullable()->index();
                $table->timestamp('closed_at')->nullable()->index();
                $table->timestamps();

                $table->index('created_at');
                $table->index('updated_at');
            });
        }

        if (! Schema::hasTable('conversation_items')) {
            Schema::create('conversation_items', function (Blueprint $table) {
                $table->id();
                $table->mediumText('body')->nullable();
                $table->unsignedBigInteger('user_id')->nullable()->index();
                $table->string('author', 40)->nullable()->index();
                $table->unsignedBigInteger('conversation_id')->index();
                $table->string('type')->index();
                $table->uuid('uuid')->nullable()->index();
                $table->string('email_id', 191)->nullable()->index();
                $table->string('vector_id', 191)->nullable();
                $table->json('data')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('conversation_views')) {
            Schema::create('conversation_views', function (Blueprint $table) {
                $table->id();
                $table->string('key', 10)->nullable()->unique();
                $table->string('name');
                $table->string('icon', 50)->nullable();
                $table->string('description')->nullable();
                $table->string('access', 50)->default('anyone')->index();
                $table->boolean('pinned')->default(false);
                $table->boolean('active')->default(true);
                $table->boolean('internal')->default(false)->index();
                $table->unsignedInteger('order')->default(0)->index();
                $table->unsignedInteger('owner_id')->nullable()->index();
                $table->unsignedInteger('group_id')->nullable()->index();
                $table->string('order_by', 50)->default('status_category');
                $table->string('order_dir', 5)->default('desc');
                $table->text('conditions')->nullable();
                $table->text('columns')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('agent_settings')) {
            Schema::create('agent_settings', function (Blueprint $table) {
                $table->id();
                $table->unsignedInteger('user_id')->index();
                $table->unsignedInteger('assignment_limit')->default(6)->index();
                $table
                    ->string('accepts_conversations', 30)
                    ->default('yes')
                    ->index();
                $table->text('working_hours')->nullable();
            });
        }

        if (! Schema::hasTable('agent_invites')) {
            Schema::create('agent_invites', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->unsignedInteger('group_id')->index();
                $table->unsignedInteger('role_id')->index();
                $table->string('email')->index();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('agent_invites');
        Schema::dropIfExists('agent_settings');
        Schema::dropIfExists('conversation_views');
        Schema::dropIfExists('conversation_items');
        Schema::dropIfExists('conversations');
        Schema::dropIfExists('conversation_statuses');
        Schema::dropIfExists('group_user');
        Schema::dropIfExists('groups');
    }
};
