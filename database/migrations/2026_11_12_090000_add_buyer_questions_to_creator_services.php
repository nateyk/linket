<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('creator_services', function (Blueprint $table): void {
            $table->json('buyer_questions')->nullable();
        });

        Schema::table('creator_service_inquiries', function (Blueprint $table): void {
            $table->json('question_answers')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('creator_service_inquiries', function (Blueprint $table): void {
            $table->dropColumn('question_answers');
        });

        Schema::table('creator_services', function (Blueprint $table): void {
            $table->dropColumn('buyer_questions');
        });
    }
};
