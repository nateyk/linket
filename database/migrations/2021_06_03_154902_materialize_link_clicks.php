<?php

use App\Links\Models\Link;
use Illuminate\Database\Migrations\Migration;

class MaterializeLinkClicks extends Migration
{
    public function up()
    {
        $cursor = DB::table('link_clicks')
            ->where('crawler', false)
            ->select(['link_clicks.link_id', DB::raw('count(*) as clicks_count')])
            ->groupBy('link_clicks.link_id')
            ->cursor();

        foreach ($cursor as $linkClicks) {
            Link::where('id', $linkClicks->link_id)->update([
                'clicks_count' => $linkClicks->clicks_count,
            ]);
        }
    }

    public function down()
    {
        //
    }
}
