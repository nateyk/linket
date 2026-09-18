<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('digital_products', function (Blueprint $table) {
            $table->timestamp('review_requested_at')->nullable()->after('approved_at')->index();
            $table->unsignedInteger('review_requested_by')->nullable()->after('review_requested_at');
            $table->foreign('review_requested_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('digital_products', function (Blueprint $table) {
            $table->dropIndex(['review_requested_at']);
            $table->dropConstrainedForeignId('review_requested_by');
            $table->dropColumn('review_requested_at');
        });
    }
};
