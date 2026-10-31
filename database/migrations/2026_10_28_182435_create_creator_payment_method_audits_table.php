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
        Schema::create('creator_payment_method_audits', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('creator_payment_method_id')->constrained('creator_payment_methods')->restrictOnDelete();
            $table->unsignedInteger('actor_id');
            $table->foreign('actor_id')->references('id')->on('users')->restrictOnDelete();
            $table->longText('encrypted_snapshot');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('creator_payment_method_audits');
    }
};
