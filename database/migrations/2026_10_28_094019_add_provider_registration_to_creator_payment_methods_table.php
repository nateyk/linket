<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('creator_payment_methods', function (Blueprint $table): void {
            $table->string('provider_registration_status', 24)->default('pending');
            $table->timestamp('provider_registered_at')->nullable();
            $table->unsignedInteger('provider_registered_by')->nullable();
            $table->boolean('is_suspended')->default(false);
            $table->timestamp('suspended_at')->nullable();
            $table->unsignedInteger('suspended_by')->nullable();
            $table->foreign('provider_registered_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('suspended_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('creator_payment_methods', function (Blueprint $table): void {
            $table->dropForeign(['provider_registered_by']);
            $table->dropForeign(['suspended_by']);
            $table->dropColumn([
                'provider_registration_status', 'provider_registered_at', 'provider_registered_by',
                'is_suspended', 'suspended_at', 'suspended_by',
            ]);
        });
    }
};
