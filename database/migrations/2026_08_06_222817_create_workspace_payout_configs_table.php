<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workspace_payout_configs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
            $table->foreignId('withdrawal_method_id')->nullable()->constrained('digital_product_withdrawal_methods')->nullOnDelete();
            $table->text('withdrawal_account');
            $table->timestamps();

            $table->unique(['workspace_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workspace_payout_configs');
    }
};