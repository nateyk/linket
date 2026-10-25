<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('ai_agents')) {
            return;
        }

        if (DB::table('ai_agents')->exists()) {
            return;
        }

        DB::table('ai_agents')->insert([
            'name' => 'Default',
            'enabled' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        // Keep seeded agent.
    }
};
