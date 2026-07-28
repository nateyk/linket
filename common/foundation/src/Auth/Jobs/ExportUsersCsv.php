<?php

namespace Common\Auth\Jobs;

use App\Models\User;
use Common\Csv\BaseCsvExportJob;
use Illuminate\Bus\Queueable;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Collection;

class ExportUsersCsv extends BaseCsvExportJob
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function cacheName(): string
    {
        return 'users';
    }

    protected function generateLines()
    {
        $selectCols = [
            'id',
            'email',
            'username',
            'name',
            'image',
            'created_at',
            'language',
            'country',
            'timezone',
        ];

        User::select($selectCols)->chunkById(100, function (
            Collection $chunk,
        ) use ($selectCols) {
            $chunk->each(
                fn(User $user) => $this->writeLineToCsv(
                    $user->only($selectCols),
                ),
            );
        });
    }
}
