<?php

namespace Common\Files\Controllers;

use Common\Core\BaseController;
use Common\Files\FileEntry;
use Common\Files\Response\DownloadFilesResponse;
use Common\Files\Response\FileResponseFactory;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * @tags Files
 */
class DownloadFileController extends Controller
{
    public function __construct(
        protected Request $request,
        protected FileEntry $fileEntry,
        protected FileResponseFactory $fileResponseFactory,
    ) {}

    /**
     * Download files.
     *
     * @operationId downloadFiles
     */
    public function download(string $hashes)
    {
        $hashes = explode(',', $hashes);
        $ids = array_map(function ($hash) {
            return $this->fileEntry->decodeHash($hash);
        }, $hashes);
        $ids = array_filter($ids);

        if (!$ids) {
            abort(404, 'No entry hashes provided.');
        }

        $entries = FileEntry::query()->whereIn('id', $ids)->get();

        Gate::authorize('download', [FileEntry::class, $entries]);

        return app(DownloadFilesResponse::class)->create($entries);
    }
}
