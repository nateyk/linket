<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_manual_approvals', function (Blueprint $table): void {
            $table->unsignedInteger('approved_by')->nullable();
            $table->string('approval_source', 24)->default('creator');
            $table->foreign('approved_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('order_manual_approvals', function (Blueprint $table): void {
            $table->dropForeign(['approved_by']);
            $table->dropColumn(['approved_by', 'approval_source']);
        });
    }
};
