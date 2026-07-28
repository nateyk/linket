<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('biolink_widgets', function (Blueprint $table) {
            $table->string('pinned', 10)->nullable()->index()->after('config');
        });
    }

    public function down()
    {
        Schema::table('biolink_widgets', function (Blueprint $table) {
            $table->dropColumn('pinned');
        });
    }
};
