<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('roles') && ! Schema::hasColumn('roles', 'agents')) {
            Schema::table('roles', function (Blueprint $table) {
                $table->boolean('agents')->default(false)->after('id');
            });
        }

        if (Schema::hasTable('users') && ! Schema::hasColumn('users', 'type')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('type', 20)->nullable()->index()->after('email');
            });
        }

        if (
            Schema::hasTable('taggables') &&
            ! Schema::hasColumn('taggables', 'user_id')
        ) {
            Schema::table('taggables', function (Blueprint $table) {
                $table->unsignedBigInteger('user_id')->nullable()->index();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('roles') && Schema::hasColumn('roles', 'agents')) {
            Schema::table('roles', function (Blueprint $table) {
                $table->dropColumn('agents');
            });
        }

        if (Schema::hasTable('taggables') && Schema::hasColumn('taggables', 'user_id')) {
            Schema::table('taggables', function (Blueprint $table) {
                $table->dropColumn('user_id');
            });
        }

        // Do not drop users.type — may be used by other features.
    }
};
