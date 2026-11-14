<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('storefront_journal_entries')) {
            Schema::create('storefront_journal_entries', function (Blueprint $table): void {
                $table->id();
                $table->uuid('uuid')->unique();
                $table->unsignedBigInteger('entry_number')->index();
                $table->string('source_type', 64);
                $table->unsignedBigInteger('source_id');
                $table->string('event_type', 64);
                $table->unsignedInteger('creator_id')->nullable()->index();
                $table->unsignedBigInteger('workspace_id')->nullable()->index();
                $table->string('currency', 12);
                $table->string('description')->nullable();
                $table->timestamp('occurred_at');
                $table->foreignId('reversal_of_id')->nullable()->constrained('storefront_journal_entries')->nullOnDelete();
                $table->json('metadata')->nullable();
                $table->timestamps();

                $table->unique(['source_type', 'source_id', 'event_type'], 'sf_journal_entries_source_event_uq');
                $table->foreign('creator_id')->references('id')->on('users')->nullOnDelete();
            });
        }

        if (!Schema::hasTable('storefront_journal_lines')) {
            Schema::create('storefront_journal_lines', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('journal_entry_id')->constrained('storefront_journal_entries')->cascadeOnDelete();
                $table->string('account_code', 64)->index();
                $table->unsignedInteger('creator_id')->nullable()->index();
                $table->unsignedBigInteger('workspace_id')->nullable()->index();
                $table->string('currency', 12);
                $table->unsignedBigInteger('debit_cents')->default(0);
                $table->unsignedBigInteger('credit_cents')->default(0);
                $table->timestamps();

                $table->index(['creator_id', 'currency', 'account_code'], 'sf_journal_lines_creator_curr_acct_idx');
                $table->foreign('creator_id')->references('id')->on('users')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('storefront_journal_lines');
        Schema::dropIfExists('storefront_journal_entries');
    }
};
