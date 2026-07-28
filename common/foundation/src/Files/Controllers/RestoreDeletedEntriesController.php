<?php

namespace Common\Files\Controllers;

use Illuminate\Routing\Controller;
use Common\Files\Actions\Deletion\RestoreEntries;
use Common\Files\FileEntry;
use Illuminate\Http\Request;

/**
 * @tags Files
 */
class RestoreDeletedEntriesController extends Controller
{
    public function restore(Request $request)
    {
        $data = $request->validate([
            'entryIds' => 'required|array|exists:file_entries,id',
        ]);

        $this->authorize('destroy', [FileEntry::class, $data['entryIds']]);

        (new RestoreEntries())->execute($data['entryIds']);

        return response()->noContent();
    }
}
