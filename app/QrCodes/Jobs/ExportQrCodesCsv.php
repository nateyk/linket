<?php

namespace App\QrCodes\Jobs;

use App\Models\User;
use App\QrCodes\Models\QrCode;
use Common\Csv\BaseCsvExportJob;
use Illuminate\Bus\Queueable;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Collection;

class ExportQrCodesCsv extends BaseCsvExportJob
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        protected int $requesterId,
        protected ?User $forUser = null,
    ) {}

    public function cacheName(): string
    {
        $userId = $this->forUser ? $this->forUser->id : 'all';
        return "qr-codes.$userId";
    }

    protected function notificationName(): string
    {
        return 'qr-codes';
    }

    protected function generateLines()
    {
        $selectCols = [
            'id',
            'name',
            'back_half',
            'long_url',
            'expires_at',
            'scanned_at',
            'scans_count',
            'created_at',
        ];

        $builder = $this->forUser
            ? QrCode::query()->where('user_id', $this->forUser->id)
            : QrCode::query();

        $builder
            ->select($selectCols)
            ->chunkById(100, function (Collection $chunk) {
                $chunk->each(function (QrCode $qrCode) {
                    $data = $qrCode->toArray();
                    unset(
                        $data['id'],
                        $data['model_type'],
                    );
                    $this->writeLineToCsv($data);
                });
            });
    }
}
