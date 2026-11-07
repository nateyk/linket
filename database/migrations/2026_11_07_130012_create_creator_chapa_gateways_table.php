<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('creator_chapa_gateways', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('workspace_id')->unique()->constrained()->cascadeOnDelete();
            $table->unsignedInteger('user_id');
            $table->string('public_key');
            $table->text('secret_key');
            $table->timestamps();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });

        Schema::table('workspaces', function (Blueprint $table): void {
            $table->string('active_payment_collector', 32)->default('verify_et');
        });
    }

    public function down(): void
    {
        Schema::table('workspaces', function (Blueprint $table): void {
            $table->dropColumn('active_payment_collector');
        });
        Schema::dropIfExists('creator_chapa_gateways');
    }
};
