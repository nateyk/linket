<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('storefront_payout_intents', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('payout_request_id')->index();
            $table->string('merchant_reference', 20)->unique();
            $table->uuid('idempotency_key')->unique();
            $table->unsignedBigInteger('amount_cents');
            $table->string('currency', 12)->default('ETB');
            $table->string('provider', 32)->default('chapa');
            $table->string('withdrawal_code', 32);
            $table->text('destination_snapshot');
            $table->string('status', 32)->default('prepared')->index();
            $table->string('chapa_reference', 64)->nullable()->index();
            $table->unsignedInteger('attempts')->default(1);
            $table->text('last_error')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->json('verification_data')->nullable();
            $table->timestamps();

            $table->index(['payout_request_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('storefront_payout_intents');
    }
};
