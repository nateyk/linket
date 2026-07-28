<?php

namespace Common\Auth\Jobs;

use Common\Roles\Models\Role;
use Common\Csv\BaseCsvExportJob;
use Illuminate\Bus\Queueable;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Collection;

class ExportRolesCsv extends BaseCsvExportJob
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function cacheName(): string
    {
        return 'roles';
    }

    protected function generateLines()
    {
        $selectCols = [
            'id',
            'name',
            'description',
            'type',
            'internal',
            'created_at',
            'updated_at',
        ];

        Role::select($selectCols)->chunkById(100, function (
            Collection $chunk,
        ) use ($selectCols) {
            $chunk->each(
                fn(Role $role) => $this->writeLineToCsv(
                    $role->only($selectCols),
                ),
            );
        });
    }
}
