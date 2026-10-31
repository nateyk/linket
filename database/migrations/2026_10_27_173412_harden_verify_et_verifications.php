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
        Schema::table('direct_payment_verifications', function (Blueprint $table): void {
            $table->dropUnique('direct_payment_verifications_reference_unique');
            $table->uuid('attempt_uuid')->nullable()->unique()->after('id');
            $table->string('idempotency_key', 255)->nullable()->unique()->after('attempt');
            $table->string('canonical_transaction_identity', 255)->nullable()->after('reference');
            $table->string('provider_status_url')->nullable()->after('provider_request_id');
            $table->string('provider_processing_status', 32)->nullable()->after('provider_status_url');
            $table->json('provider_result')->nullable()->after('provider_processing_status');
            $table->json('provider_input')->nullable()->after('bank_code');
            $table->string('latest_error_code', 80)->nullable()->after('provider_result');
            $table->text('latest_error')->nullable()->after('latest_error_code');
            $table->unique(['bank_code', 'canonical_transaction_identity'], 'verify_et_canonical_transaction_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('direct_payment_verifications', function (Blueprint $table): void {
            $table->dropUnique('verify_et_canonical_transaction_unique');
            $table->dropUnique('direct_payment_verifications_idempotency_key_unique');
            $table->dropUnique('direct_payment_verifications_attempt_uuid_unique');
            $table->unique('reference');
            $table->dropColumn(['attempt_uuid', 'idempotency_key', 'canonical_transaction_identity', 'provider_status_url', 'provider_processing_status', 'provider_result', 'provider_input', 'latest_error_code', 'latest_error']);
        });
    }
};
