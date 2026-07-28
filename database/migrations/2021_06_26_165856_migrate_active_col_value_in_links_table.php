<?php

use App\Links\Models\Link;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Collection;

class MigrateActiveColValueInLinksTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Link::chunkById(500, function(Collection $links) {
            Link::whereIn('id', $links->pluck('id'))->update(['active' => DB::raw('ABS(active - 1)')]);
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        //
    }
}
