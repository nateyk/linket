<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('course_enrollments', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
        });

        Schema::table('course_enrollments', function (Blueprint $table) {
            $table->unsignedInteger('user_id')->nullable()->change();
            $table->char('portal_email_hash', 64)->nullable()->after('user_id');
        });

        Schema::table('course_enrollments', function (Blueprint $table) {
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
            $table->unique(['course_id', 'portal_email_hash'], 'course_enrollments_course_portal_email_unique');
        });

        Schema::table('course_lesson_progress', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
        });

        Schema::table('course_lesson_progress', function (Blueprint $table) {
            $table->unsignedInteger('user_id')->nullable()->change();
            $table->char('portal_email_hash', 64)->nullable()->after('user_id');
        });

        Schema::table('course_lesson_progress', function (Blueprint $table) {
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('course_enrollments', function (Blueprint $table) {
            $table->dropUnique('course_enrollments_course_portal_email_unique');
            $table->dropForeign(['user_id']);
            $table->dropColumn('portal_email_hash');
        });

        Schema::table('course_enrollments', function (Blueprint $table) {
            $table->unsignedInteger('user_id')->nullable(false)->change();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });

        Schema::table('course_lesson_progress', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropColumn('portal_email_hash');
        });

        Schema::table('course_lesson_progress', function (Blueprint $table) {
            $table->unsignedInteger('user_id')->nullable(false)->change();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });
    }
};
