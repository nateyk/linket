<?php

namespace Common\Files\Controllers;

use Common\Files\FileEntry;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;

/**
 * @tags Files
 */
class AddPreviewTokenController extends Controller
{
    /**
     * Add preview token to file entry.
     *
     * @operationId addPreviewToken
     */
    public function store(int $id)
    {
        $entry = FileEntry::query()->findOrFail($id);

        Gate::authorize('show', $entry);

        $token = Str::random(15);
        $entry->update(['preview_token' => $token]);

        return response()->json(['preview_token' => $token]);
    }
}
