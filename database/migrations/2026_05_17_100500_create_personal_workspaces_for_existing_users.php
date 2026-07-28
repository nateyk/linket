<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    private const CHUNK_SIZE = 1000;

    private const RESOURCE_TABLES = [
        ['table' => 'links', 'owner_column' => 'user_id'],
        ['table' => 'tags', 'owner_column' => 'user_id'],
        ['table' => 'folders', 'owner_column' => 'user_id'],
        [
            'table' => 'link_pages',
            'owner_column' => 'user_id',
        ],
        [
            'table' => 'custom_domains',
            'owner_column' => 'user_id',
            'where' => ['global' => false],
        ],
        ['table' => 'link_overlays', 'owner_column' => 'user_id'],
        ['table' => 'tracking_pixels', 'owner_column' => 'user_id'],
        ['table' => 'file_entries', 'owner_column' => 'user_id'],
        ['table' => 'qr_codes', 'owner_column' => 'user_id'],
    ];

    public function up(): void
    {
        if (!Schema::hasTable('users') || !Schema::hasTable('workspaces')) {
            return;
        }

        if (!Schema::hasColumn('workspaces', 'image')) {
            Schema::table('workspaces', function (Blueprint $table) {
                $table->string('image')->nullable()->after('name');
            });
        }

        $this->addPersonalWorkspaceColumn();
        $this->createMissingPersonalWorkspaces();
        $this->attachOwnersToPersonalWorkspaces();
        $this->moveLegacyResourcesToPersonalWorkspaces();
        $this->attachMissingWorkspaceOwners();
    }

    private function addPersonalWorkspaceColumn(): void
    {
        if (!Schema::hasColumn('workspaces', 'is_personal')) {
            Schema::table('workspaces', function (Blueprint $table) {
                $table
                    ->boolean('is_personal')
                    ->default(false)
                    ->index()
                    ->after('owner_id');
            });
        }
    }

    private function createMissingPersonalWorkspaces(): void
    {
        DB::table('users')
            ->select('users.id')
            ->leftJoin('workspaces', function ($join) {
                $join
                    ->on('workspaces.owner_id', '=', 'users.id')
                    ->where('workspaces.is_personal', true);
            })
            ->whereNull('workspaces.id')
            ->orderBy('users.id')
            ->chunkById(
                self::CHUNK_SIZE,
                function (Collection $users) {
                    $now = now();
                    $rows = $users
                        ->map(
                            fn($user) => [
                                'name' => 'Default',
                                'owner_id' => $user->id,
                                'is_personal' => true,
                                'created_at' => $now,
                                'updated_at' => $now,
                            ],
                        )
                        ->all();

                    if ($rows) {
                        DB::table('workspaces')->insert($rows);
                    }
                },
                'users.id',
                'id',
            );
    }

    private function attachOwnersToPersonalWorkspaces(): void
    {
        if (!Schema::hasTable('workspace_user')) {
            return;
        }

        DB::table('workspaces')
            ->select('workspaces.id', 'workspaces.owner_id')
            ->leftJoin('workspace_user', function ($join) {
                $join
                    ->on('workspace_user.workspace_id', '=', 'workspaces.id')
                    ->on('workspace_user.user_id', '=', 'workspaces.owner_id');
            })
            ->where('workspaces.is_personal', true)
            ->whereNull('workspace_user.id')
            ->orderBy('workspaces.id')
            ->chunkById(
                self::CHUNK_SIZE,
                function (Collection $workspaces) {
                    $now = now();
                    $rows = $workspaces
                        ->map(
                            fn($workspace) => [
                                'user_id' => $workspace->owner_id,
                                'workspace_id' => $workspace->id,
                                'role_id' => null,
                                'is_owner' => true,
                                'created_at' => $now,
                                'updated_at' => $now,
                            ],
                        )
                        ->all();

                    if ($rows) {
                        DB::table('workspace_user')->insertOrIgnore($rows);
                    }
                },
                'workspaces.id',
                'id',
            );
    }

    private function moveLegacyResourcesToPersonalWorkspaces(): void
    {
        foreach (self::RESOURCE_TABLES as $resource) {
            $table = $resource['table'];
            $ownerColumn = $resource['owner_column'];

            if (
                !Schema::hasTable($table) ||
                !Schema::hasColumn($table, 'id') ||
                !Schema::hasColumn($table, 'workspace_id') ||
                !Schema::hasColumn($table, $ownerColumn)
            ) {
                continue;
            }

            $this->moveLegacyResourceTable(
                $table,
                $ownerColumn,
                $resource['where'] ?? [],
            );
        }
    }

    private function moveLegacyResourceTable(
        string $table,
        string $ownerColumn,
        array $where,
    ): void {
        do {
            $query = DB::table($table)
                ->select(["$table.id as id", 'workspaces.id as workspace_id'])
                ->join('workspaces', function ($join) use (
                    $table,
                    $ownerColumn,
                ) {
                    $join
                        ->on('workspaces.owner_id', '=', "$table.$ownerColumn")
                        ->where('workspaces.is_personal', true);
                })
                ->where("$table.workspace_id", 0)
                ->whereNotNull("$table.$ownerColumn")
                ->orderBy("$table.id")
                ->limit(self::CHUNK_SIZE);

            foreach ($where as $column => $value) {
                if (Schema::hasColumn($table, $column)) {
                    $query->where("$table.$column", $value);
                }
            }

            $rows = $query->get();

            $rows
                ->groupBy('workspace_id')
                ->each(function (Collection $rows, int $workspaceId) use (
                    $table,
                ) {
                    DB::table($table)
                        ->where('workspace_id', 0)
                        ->whereIn('id', $rows->pluck('id')->all())
                        ->update(['workspace_id' => $workspaceId]);
                });
        } while ($rows->isNotEmpty());
    }

    private function attachMissingWorkspaceOwners(): void
    {
        if (
            !Schema::hasTable('workspace_user') ||
            !Schema::hasColumn('workspace_user', 'is_owner')
        ) {
            return;
        }

        DB::table('workspaces')
            ->select('workspaces.id', 'workspaces.owner_id')
            ->whereNotNull('workspaces.owner_id')
            ->whereNotExists(function ($query) {
                $query
                    ->select(DB::raw(1))
                    ->from('workspace_user')
                    ->whereColumn(
                        'workspace_user.workspace_id',
                        'workspaces.id',
                    )
                    ->where('workspace_user.is_owner', true);
            })
            ->orderBy('workspaces.id')
            ->chunkById(
                self::CHUNK_SIZE,
                function (Collection $workspaces) {
                    $now = now();
                    $rows = $workspaces
                        ->map(
                            fn($workspace) => [
                                'user_id' => $workspace->owner_id,
                                'workspace_id' => $workspace->id,
                                'role_id' => null,
                                'is_owner' => true,
                                'created_at' => $now,
                                'updated_at' => $now,
                            ],
                        )
                        ->all();

                    if ($rows) {
                        DB::table('workspace_user')->upsert(
                            $rows,
                            ['user_id', 'workspace_id'],
                            ['is_owner', 'updated_at'],
                        );
                    }
                },
                'workspaces.id',
                'id',
            );
    }
};
