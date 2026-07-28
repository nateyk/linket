<?php

use App\Analytics\Models\TrackedEvent;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

class HydrateOwnerIdColInLinkClicksTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        if (Schema::hasTable('tracked_events')) {
            TrackedEvent::whereNull('owner_id')
                ->with(['linkeable'])
                ->chunkById(50, function ($chunk) {
                    $chunk->each(function ($click) {
                        $click
                            ->fill([
                                'owner_id' => $click->linkeable->user_id ?? 0,
                            ])
                            ->save();
                    });
                });
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down() {}
}
