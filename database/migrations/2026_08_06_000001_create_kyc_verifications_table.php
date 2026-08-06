<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('kyc_verifications')) Schema::create('kyc_verifications', function (Blueprint $table): void {
            $table->id();
            $table->unsignedInteger('user_id');
            $table->string('document_type')->index();
            $table->string('document_number', 64);
            $table->json('documents');
            $table->string('status')->default('pending')->index();
            $table->text('rejection_reason')->nullable();
            $table->unsignedInteger('reviewed_by')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('reviewed_by')->references('id')->on('users')->nullOnDelete();
        });

        if (!Schema::hasColumn('users', 'kyc_status')) Schema::table('users', function (Blueprint $table): void {
            $table->string('kyc_status')->nullable()->index()->after('email');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('kyc_status');
        });
        Schema::dropIfExists('kyc_verifications');
    }
};
