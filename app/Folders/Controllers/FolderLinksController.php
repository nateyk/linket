<?php

namespace App\Folders\Controllers;

use App\Folders\Models\Folder;
use App\Links\Models\Link;
use Dedoc\Scramble\Attributes\Group;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;

#[Group('Folders', weight: 9)]
class FolderLinksController extends Controller
{
    /**
     * Attach links to a folder.
     *
     * @operationId attachFolderLinks
     */
    public function attach(int $id, Request $request)
    {
        $folder = Folder::findOrFail($id);

        Gate::authorize('update', $folder);

        $data = $request->validate([
            // List of link ids to attach to this folder.
            'linkIds' => 'required|array|min:1',
            'linkIds.*' => 'required|integer',
        ]);

        Link::query()
            ->whereIn('id', $data['linkIds'])
            ->update(['folder_id' => $folder->id]);

        return response()->noContent();
    }

    /**
     * Detach links from a folder.
     *
     * @operationId detachFolderLinks
     */
    public function detach(int $id, Request $request)
    {
        $folder = Folder::findOrFail($id);

        $data = $request->validate([
            // List of link ids to detach from this folder.
            'linkIds' => 'required|array|min:1',
            'linkIds.*' => 'required|integer',
        ]);

        Gate::authorize('destroy', [Link::class, $data['linkIds']]);

        Link::query()
            ->whereIn('id', $data['linkIds'])
            ->where('folder_id', $folder->id)
            ->update(['folder_id' => null]);

        return response()->noContent();
    }
}
