<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('workspaces', 'active_payment_collector')) {
            return;
        }

        // Change only the default for future workspaces. Historical selections,
        // checkouts, provider references, and financial evidence remain untouched.
        Schema::table('workspaces', function (Blueprint $table): void {
            $table->string('active_payment_collector', 32)->default('unavailable')->change();
        });
    }

    public function down(): void
    {
        if (!Schema::hasColumn('workspaces', 'active_payment_collector')) {
            return;
        }

        Schema::table('workspaces', function (Blueprint $table): void {
            $table->string('active_payment_collector', 32)->default('verify_et')->change();
        });
    }
};
