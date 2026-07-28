<?php

namespace Common\Csv;

use Illuminate\Support\Facades\Auth;
use Common\Csv\CsvExport;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Storage;

/**
 * @tags System
 */
class DownloadCsvExportController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
    }

    /**
     * Download a CSV export.
     *
     * @operationId downloadCsvExport
     */
    public function download(int $id)
    {
        $csvExport = CsvExport::query()->findOrFail($id);

        if (
            !Auth::user()->hasPermission('admin') &&
            $csvExport->user_id !== Auth::id()
        ) {
            abort(403);
        }

        return Storage::download(
            $csvExport->filePath(),
            $csvExport->download_name,
        );
    }
}
