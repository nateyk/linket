<?php

namespace Common\Logging\Error;

use Common\Core\Demo\BlockedOnDemoSite;
use Illuminate\Http\Request;
use Illuminate\Pagination\Paginator;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;
use Opcodes\LogViewer\Facades\LogViewer;

/**
 * @tags Logs, Admin
 */
class ErrorLogController extends Controller
{
    public function __construct()
    {
        $this->middleware('isAdmin');
    }

    /**
     * List error log items.
     *
     * @operationId listErrorLogItems
     */
    public function index(Request $request)
    {
        $data = $request->validate([
            'page' => 'integer',
            'per_page' => 'integer',
            'query' => 'string|nullable',
            'file' => 'string|nullable',
        ]);
        $perPage = $data['per_page'] ?? 15;
        $searchQuery = $data['query'] ?? null;
        $file = $data['file'] ?? null;

        $pagination = null;
        $files = null;
        $emptyPagination = new Paginator([], 15);

        if (config('app.demo')) {
            $pagination = $emptyPagination;
        } else {
            $files = LogViewer::getFiles()->sortByLatestFirst()->values();

            if ($files->isEmpty()) {
                $pagination = $emptyPagination;
            } else {
                $file = $file
                    ? $files->firstWhere('identifier', $file)
                    : $files->first();
                if (!$file) {
                    $pagination = $emptyPagination;
                } else {
                    $logQuery = $file->logs();

                    if ($searchQuery) {
                        $logQuery->search($searchQuery);
                    }

                    $pagination = $logQuery
                        ->reverse()
                        ->scan()
                        ->paginate($perPage);

                    $pagination->through(
                        fn($log) => new ErrorLogItemResource($log),
                    );
                }
            }
        }

        return ErrorLogItemResource::collection($pagination)->additional([
            'selectedFile' => $files ? $files->first()?->identifier : null,
            /** @var array<array{name: string, identifier: string, size: int}> $files */
            'files' => $files
                ? $files->map(
                    fn($file) => [
                        'name' => $file->name,
                        'identifier' => $file->identifier,
                        'size' => $file->size(),
                    ],
                )
                : [],
        ]);
    }

    /**
     * Download an error log file.
     *
     * @operationId downloadErrorLogFile
     */
    public function download(string $identifier)
    {
        if (!Auth::user()->hasPermission('reports.view')) {
            abort(403);
        }

        $file = LogViewer::getFile($identifier);

        return $file->download();
    }

    /**
     * Delete an error log file.
     *
     * @operationId deleteErrorLogFile
     */
    #[BlockedOnDemoSite]
    public function destroy(string $fileIdentifier)
    {
        if (!Auth::user()->hasPermission('reports.view')) {
            abort(403);
        }

        $file = LogViewer::getFile($fileIdentifier);

        if (!is_null($file)) {
            $file->delete();
        }

        return response()->noContent();
    }
}
