<?php

use App\Links\Models\Link;
use App\Analytics\Models\TrackedEvent;
use App\Links\Models\LinkeableRule;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class HydrateLinkeableTypeColumn extends Migration
{
    public function up()
    {
        LinkeableRule::whereNotNull('linkeable_id')->update([
            'linkeable_type' => Link::class,
        ]);

        if (Schema::hasTable('tracked_events')) {
            TrackedEvent::whereNotNull('linkeable_id')->update([
                'linkeable_type' => Link::class,
            ]);
        }

        if (Schema::hasTable('link_tracking_pixel')) {
            DB::table('link_tracking_pixel')
                ->whereNotNull('linkeable_id')
                ->update([
                    'linkeable_type' => Link::class,
                ]);
        }
    }
}
