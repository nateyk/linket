<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('creator_payment_methods', function (Blueprint $table): void {
            $table->text('rejection_reason')->nullable()->after('status');
            $table->text('suspension_reason')->nullable()->after('is_suspended');
        });

        Schema::table('creator_payment_method_audits', function (Blueprint $table): void {
            $table->string('action', 64)->nullable()->after('actor_id');
            $table->text('note')->nullable()->after('action');
        });
    }

    public function down(): void
    {
        Schema::table('creator_payment_method_audits', function (Blueprint $table): void {
            $table->dropColumn(['action', 'note']);
        });

        Schema::table('creator_payment_methods', function (Blueprint $table): void {
            $table->dropColumn(['rejection_reason', 'suspension_reason']);
        });
    }
};
