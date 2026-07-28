<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('qr_codes', function (Blueprint $table) {
            $table->id();
            $table->string('back_half', 30)->index()->unique();
            $table->integer('domain_id')->unsigned()->index()->default(0);
            $table->bigInteger('linkeable_id')->unsigned()->nullable()->index();
            $table->string('linkeable_type', 12)->nullable()->index();
            $table->string('name', 190)->nullable();
            $table->text('long_url')->nullable();
            $table->integer('user_id')->unsigned()->index();
            $table->integer('workspace_id')->unsigned()->index()->default(0);
            $table->timestamp('expires_at')->nullable()->index();
            $table->timestamp('scanned_at')->nullable()->index();
            $table->integer('scans_count')->unsigned()->default(0)->index();
            $table->string('password', 100)->nullable();
            $table->text('utm')->nullable();
            $table->longText('style')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('qr_codes');
    }
};
