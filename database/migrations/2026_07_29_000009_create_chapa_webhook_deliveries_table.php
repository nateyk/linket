<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('chapa_webhook_deliveries')) {
            return;
        }

        Schema::create('chapa_webhook_deliveries', function (Blueprint $table): void {
            $table->id();
            $table->string('tx_ref', 120)->nullable()->index();
            $table->boolean('signature_valid')->index();
            $table->string('status', 32)->index();
            $table->string('failure_reason', 64)->nullable();
            $table->timestamp('received_at')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chapa_webhook_deliveries');
    }
};
