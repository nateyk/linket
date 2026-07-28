<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('links', function (Blueprint $table) {
            $table
                ->unsignedInteger('folder_id')
                ->nullable()
                ->after('workspace_id')
                ->index();
        });

        if (Schema::hasTable('folder_link')) {
            DB::table('links')
                ->joinSub(
                    DB::table('folder_link')
                        ->select(
                            'link_id',
                            DB::raw('MIN(folder_id) as folder_id'),
                        )
                        ->groupBy('link_id'),
                    'folder_link',
                    'links.id',
                    '=',
                    'folder_link.link_id',
                )
                ->update([
                    'links.folder_id' => DB::raw('folder_link.folder_id'),
                ]);
        }
    }
};
