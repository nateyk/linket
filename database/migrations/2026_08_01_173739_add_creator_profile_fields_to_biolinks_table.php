<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('biolinks', function (Blueprint $table) {
            $table
                ->string('builder_mode', 32)
                ->default('legacy')
                ->after('workspace_id')
                ->index();
            $table->json('profile_config')->nullable()->after('builder_mode');
        });
    }

    public function down(): void
    {
        Schema::table('biolinks', function (Blueprint $table) {
            $table->dropColumn(['builder_mode', 'profile_config']);
        });
    }
};
