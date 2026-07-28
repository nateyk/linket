<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    private const CHUNK_SIZE = 100000;

    public function up(): void
    {
        Schema::table('links', function (Blueprint $table) {
            if (!Schema::hasColumn('links', 'back_half')) {
                $table->string('back_half', 50)->after('name');
            }

            if (!Schema::hasIndex('links', ['domain_id', 'back_half'])) {
                $table->index(['domain_id', 'back_half']);
            }

            if (Schema::hasColumn('links', 'hash')) {
                $table->string('hash', 10)->nullable()->change();
            }
        });

        Schema::table('folders', function (Blueprint $table) {
            if (!Schema::hasColumn('folders', 'back_half')) {
                $table->string('back_half', 50)->after('name');
            }

            if (!Schema::hasIndex('folders', ['domain_id', 'back_half'])) {
                $table->index(['domain_id', 'back_half']);
            }

            if (Schema::hasColumn('folders', 'hash')) {
                $table->string('hash', 10)->nullable()->change();
            }
        });

        $this->backfillLinks();
        $this->backfillFolders();
    }

    private function backfillLinks(): void
    {
        [$minId, $maxId] = $this->idRange('links');

        if (is_null($minId) || is_null($maxId)) {
            return;
        }

        for ($start = $minId; $start <= $maxId; $start += self::CHUNK_SIZE) {
            $end = $start + self::CHUNK_SIZE - 1;
            DB::table('links')
                ->whereBetween('id', [$start, $end])
                ->update([
                    // Use alias when present, otherwise fallback to generated hash.
                    'back_half' => DB::raw("COALESCE(NULLIF(alias, ''), hash)"),
                ]);
        }
    }

    private function backfillFolders(): void
    {
        [$minId, $maxId] = $this->idRange('folders');

        if (is_null($minId) || is_null($maxId)) {
            return;
        }

        for ($start = $minId; $start <= $maxId; $start += self::CHUNK_SIZE) {
            $end = $start + self::CHUNK_SIZE - 1;
            DB::table('folders')
                ->whereBetween('id', [$start, $end])
                ->update([
                    'back_half' => DB::raw('hash'),
                ]);
        }
    }

    private function idRange(string $table): array
    {
        $row = DB::table($table)
            ->selectRaw('MIN(id) as min_id, MAX(id) as max_id')
            ->first();

        return [(int) $row?->min_id ?: null, (int) $row?->max_id ?: null];
    }
};
