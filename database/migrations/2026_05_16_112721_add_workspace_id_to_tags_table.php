<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('tags', function (Blueprint $table) {
            $table->bigInteger('workspace_id')->default(0)->after('user_id');
        });
    }

    public function down(): void
    {
        Schema::table('tags', function (Blueprint $table) {
            $table->dropColumn('workspace_id');
        });
    }
};
