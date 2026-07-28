<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('css_themes', function (Blueprint $table) {
            $table->string('radius', 10)->default('default')->after('font');
        });
    }

    public function down(): void
    {
        Schema::table('css_themes', function (Blueprint $table) {
            $table->dropColumn('radius');
        });
    }
};
