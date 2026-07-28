<?php

namespace App\Folders\Controllers;

use App\Folders\Actions\CrupdateFolder;
use App\Folders\Actions\DeleteFolders;
use App\Folders\Jobs\ExportFoldersCsv;
use App\Folders\Models\Folder;
use App\Folders\QueryBuilder\FoldersQueryBuilder;
use App\Folders\Requests\CrupdateFolderRequest;
use App\Folders\Resources\FolderResource;
use Common\Csv\CsvExport;
use Common\API\ExcludeRouteFromPublicDocs;
use Dedoc\Scramble\Attributes\Group;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;

#[Group('Folders', weight: 8)]
class FoldersController extends Controller
{
    /**
     * List all folders.
     *
     * @operationId listFolders
     */
    public function index(Request $request)
    {
        Gate::authorize('index', Folder::class);

        $data = $request->validate([
            'query' => 'nullable|string',
            'per_page' => 'integer|min:1|max:100',
            'limit' => 'integer|min:1|max:100',
            'page' => 'integer|min:1',
            'sort' => 'string',
            'workspace_id' => 'string',
            'user_id' => 'integer',
            'name' => 'string',
            'rotator' => 'string',
            'links_count' => 'string',
            'is_archived' => 'string',
            'created_at' => 'string',
            'updated_at' => 'string',
        ]);

        $pagination = (new FoldersQueryBuilder($data))->paginate();

        return FolderResource::collection($pagination);
    }

    /**
     * Retrieve a folder.
     *
     * @operationId retrieveFolder
     */
    public function show(int $id)
    {
        $folder = Folder::findOrFail($id);

        Gate::authorize('show', $folder);

        $folder->loadMissing(['user', 'qrCode']);

        return new FolderResource($folder);
    }

    /**
     * Create a folder.
     *
     * @operationId createFolder
     */
    public function store(CrupdateFolderRequest $request)
    {
        Gate::authorize('store', Folder::class);

        $folder = (new CrupdateFolder())->execute($request->validated());

        return new FolderResource($folder);
    }

    /**
     * Update a folder.
     *
     * @operationId updateFolder
     */
    public function update(int $id, CrupdateFolderRequest $request)
    {
        $folder = Folder::findOrFail($id);

        Gate::authorize('update', $folder);

        $folder = (new CrupdateFolder())->execute(
            $request->validated(),
            $folder,
        );

        return new FolderResource($folder);
    }

    /**
     * Delete multiple folders.
     *
     * @operationId deleteFolders
     */
    public function bulkDelete(Request $request)
    {
        $data = $request->validate([
            // Comma-separated list of folder IDs to delete. Maximum of 100 IDs. Non-existing IDs will be ignored.
            'folderIds' => 'required|string',
        ]);

        $folderIds = array_slice(explode(',', $data['folderIds']), 0, 100);

        Gate::authorize('destroy', [Folder::class, $folderIds]);

        (new DeleteFolders())->execute($folderIds);

        return response()->noContent();
    }

    /**
     * Archive folders.
     *
     * @operationId archiveFolders
     */
    public function bulkArchive(Request $request)
    {
        $data = $request->validate([
            // Comma-separated list of folder IDs to archive. Maximum of 100 IDs. Non-existing IDs will be ignored.
            'ids' => 'required|string',
        ]);

        $ids = array_slice(explode(',', $data['ids']), 0, 100);

        Gate::authorize('destroy', [Folder::class, $ids]);

        Folder::query()->whereIn('id', $ids)->delete();

        return response()->noContent();
    }

    /**
     * Unarchive folders.
     *
     * @operationId unarchiveFolders
     */
    public function bulkUnarchive(Request $request)
    {
        $data = $request->validate([
            // Comma-separated list of folder IDs to unarchive. Maximum of 100 IDs. Non-existing IDs will be ignored.
            'ids' => 'required|string',
        ]);

        $ids = array_slice(explode(',', $data['ids']), 0, 100);

        Gate::authorize('destroy', [Folder::class, $ids]);

        Folder::onlyTrashed()->whereIn('id', $ids)->restore();

        return response()->noContent();
    }

    /**
     * Export folders as CSV.
     *
     * @operationId exportFoldersCsv
     */
    #[ExcludeRouteFromPublicDocs]
    public function exportCsv(Request $request)
    {
        $this->middleware('auth');

        $request->validate([
            'type' => 'required|string',
        ]);

        $forUser = null;
        if (request('type') === 'all') {
            Gate::authorize('index', Folder::class);
        } else {
            $forUser = Auth::user();
        }

        return CsvExport::exportUsing(
            new ExportFoldersCsv(Auth::id(), $forUser),
        );
    }
}
