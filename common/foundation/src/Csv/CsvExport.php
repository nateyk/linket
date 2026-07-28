<?php

namespace Common\Csv;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

class CsvExport extends Model
{
    protected $guarded = [];

    protected $casts = [
        'id' => 'integer',
        'user_id' => 'integer',
    ];

    const MODEL_TYPE = 'csvExport';

    public static function getModelTypeAttribute(): string
    {
        return self::MODEL_TYPE;
    }

    public function storeFile($stream): bool
    {
        Storage::delete($this->filePath());
        return Storage::writeStream($this->filePath(), $stream);
    }

    public function filePath(): string
    {
        return "exports/csv/{$this->uuid}.csv";
    }

    public function downloadLink(): string
    {
        return url("csv/download/$this->id");
    }

    public static function exportUsing(BaseCsvExportJob $exportJob): array
    {
        $csvExport = CsvExport::query()
            ->where('cache_name', $exportJob->cacheName())
            ->first();

        if (
            $csvExport &&
            $csvExport->created_at->greaterThan(Carbon::now()->addMinutes(-30))
        ) {
            return [
                'result' => 'downloadReady',
                'downloadPath' => $csvExport->downloadLink(),
            ];
        }

        dispatch($exportJob);

        return ['result' => 'jobQueued', 'downloadPath' => null];
    }
}
