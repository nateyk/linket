<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('direct_payment_verifications', function (Blueprint $table): void {
            $table->unique('reference', 'direct_payment_verifications_reference_unique');
        });
    }

    public function down(): void
    {
        Schema::table('direct_payment_verifications', function (Blueprint $table): void {
            $table->dropUnique('direct_payment_verifications_reference_unique');
        });
    }
};
