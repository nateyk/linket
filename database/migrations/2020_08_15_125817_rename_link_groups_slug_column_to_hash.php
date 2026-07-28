<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class RenameLinkGroupsSlugColumnToHash extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('link_groups', function (Blueprint $table) {
            if (Schema::hasColumn('link_groups', 'slug')) {
                $table->renameColumn('slug', 'hash');
            }
            $table->boolean('rotator')->default(false)->index();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('link_groups', function (Blueprint $table) {
            //
        });
    }
}
