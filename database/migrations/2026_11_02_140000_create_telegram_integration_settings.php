<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('telegram_integration_settings', function (Blueprint $table): void {
            $table->unsignedTinyInteger('id')->primary();
            $table->longText('encrypted_config');
            $table->timestamps();
        });

        DB::table('telegram_integration_settings')->insert([
            'id' => 1,
            'encrypted_config' => Crypt::encryptString('{}'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('telegram_integration_settings');
    }
};
