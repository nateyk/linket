<?php

namespace App\Links\Jobs;

use App\Links\Models\Link;
use App\Models\User;
use Common\Csv\BaseCsvExportJob;
use Illuminate\Bus\Queueable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;

class ExportLinksCsv extends BaseCsvExportJob
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        protected int $requesterId,
        protected ?User $forUser = null,
        protected ?array $payload = [],
    ) {}

    public function cacheName(): string
    {
        $folderId = $this->payload['folderId'] ?? 'all';
        $userId = $this->forUser ? $this->forUser->id : 'all';
        return "links.$userId.$folderId";
    }

    protected function notificationName(): string
    {
        return 'links';
    }

    protected function generateLines()
    {
        $selectCols = [
            'id',
            'name',
            'back_half',
            'long_url',
            'type',
            'expires_at',
            'clicks_count',
            'description',
            'created_at',
        ];

        $builder = $this->forUser ? $this->forUser->links() : app(Link::class);

        $builder
            ->select($selectCols)
            ->with('domain')
            ->when(
                Arr::get($this->payload, 'folderId'),
                fn(Builder $builder) => $builder->where(
                    'folder_id',
                    $this->payload['folderId'],
                ),
            )
            ->chunkById(100, function (Collection $chunk) {
                $chunk->each(function (Link $link) {
                    $data = $link->toArray();
                    unset(
                        $data['has_password'],
                        $data['id'],
                        $data['back_half'],
                    );
                    $this->writeLineToCsv($data);
                });
            });
    }
}
