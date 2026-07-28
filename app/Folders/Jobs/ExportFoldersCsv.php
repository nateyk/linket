<?php

namespace App\Folders\Jobs;

use App\Folders\Models\Folder;
use App\Models\User;
use Common\Csv\BaseCsvExportJob;
use Illuminate\Bus\Queueable;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Collection;

class ExportFoldersCsv extends BaseCsvExportJob
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        protected int $requesterId,
        protected ?User $forUser = null,
    ) {}

    public function cacheName(): string
    {
        $cacheName = 'folders';
        if ($this->forUser) {
            $cacheName .= ".{$this->forUser->id}";
        }
        return $cacheName;
    }

    protected function notificationName(): string
    {
        return 'folders';
    }

    protected function generateLines()
    {
        $selectCols = [
            'id',
            'name',
            'back_half',
            'rotator',
            'description',
            'created_at',
            'deleted_at',
        ];

        $builder = $this->forUser ? $this->forUser->folders() : Folder::query();

        $builder
            ->select($selectCols)
            ->with('domain')
            ->chunkById(100, function (Collection $chunk) use ($selectCols) {
                $chunk->each(
                    fn(Folder $folder) => $this->writeLineToCsv(
                        $folder->only($selectCols),
                    ),
                );
            });
    }
}
