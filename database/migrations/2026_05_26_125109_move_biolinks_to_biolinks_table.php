<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (
            !Schema::hasTable('biolinks') ||
            !Schema::hasTable('folders') ||
            !Schema::hasTable('folder_link') ||
            !Schema::hasColumn('folders', 'type')
        ) {
            return;
        }

        DB::table('folders')
            ->where('type', 'biolink')
            ->orderBy('id')
            ->chunkById(500, function (Collection $items) {
                $items = $items->map(fn($item) => (array) $item);
                $existingIds = DB::table('biolinks')
                    ->whereIn('id', $items->pluck('id'))
                    ->pluck('id');
                $biolinks = $items
                    ->reject(fn($item) => $existingIds->contains($item['id']))
                    ->map(
                        fn($item) => [
                            'id' => $item['id'],
                            'name' => $item['name'],
                            'back_half' => $item['back_half'],
                            'user_id' => $item['user_id'],
                            'workspace_id' => $item['workspace_id'],
                            'domain_id' => $item['domain_id'],
                            'password' => $item['password'],
                            'clicks_count' => $item['clicks_count'],
                            'utm' => $item['utm'],
                            'expires_at' => $item['expires_at'],
                            'activates_at' => $item['activates_at'],
                            'deleted_at' => $item['deleted_at'],
                            'created_at' => $item['created_at'],
                            'updated_at' => $item['updated_at'],
                        ],
                    )
                    ->values();

                $oldPivots = DB::table('folder_link')
                    ->whereIn('folder_id', $items->pluck('id'))
                    ->get()
                    ->map(fn($pivot) => (array) $pivot);
                $existingPivots = DB::table('biolink_link')
                    ->whereIn('biolink_id', $items->pluck('id'))
                    ->pluck('id');
                $newPivots = $oldPivots
                    ->reject(
                        fn($pivot) => $existingPivots->contains($pivot['id']),
                    )
                    ->map(
                        fn($pivot) => [
                            'id' => $pivot['id'],
                            'biolink_id' => $pivot['folder_id'],
                            'link_id' => $pivot['link_id'],
                            'position' => Arr::get($pivot, 'position', 0),
                            'active' => Arr::get($pivot, 'active', true),
                            'animation' => Arr::get($pivot, 'animation', null),
                            'leap_until' => Arr::get(
                                $pivot,
                                'leap_until',
                                null,
                            ),
                            'created_at' => Arr::get(
                                $pivot,
                                'created_at',
                                now(),
                            ),
                            'updated_at' => Arr::get(
                                $pivot,
                                'updated_at',
                                now(),
                            ),
                        ],
                    )
                    ->values();

                DB::transaction(function () use (
                    $biolinks,
                    $newPivots,
                    $items,
                ) {
                    if ($biolinks->isNotEmpty()) {
                        DB::table('biolinks')->insert($biolinks->toArray());
                    }

                    if ($newPivots->isNotEmpty()) {
                        DB::table('biolink_link')->insert(
                            $newPivots->toArray(),
                        );
                    }

                    DB::table('folders')
                        ->whereIn('id', $items->pluck('id'))
                        ->delete();

                    DB::table('folder_link')
                        ->whereIn('folder_id', $items->pluck('id'))
                        ->delete();
                });
            });
    }
};
