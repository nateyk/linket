<?php

namespace Common\Files\S3;

use Common\Files\Actions\CreateFileEntry;
use Common\Files\Actions\AuthorizeUploadDestination;
use Common\Files\Actions\S3UploadGrant;
use Common\Files\Events\FileUploaded;
use Common\Files\FileEntry;
use Common\Files\FileEntryPayload;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;

/**
 * @tags Files
 */
class S3FileEntryController extends Controller
{
    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'clientExtension' => 'required|string',
            'clientMime' => 'nullable|string|max:255',
            'clientName' => 'required|string',
            'clientSize' => 'required|int',
            'filename' => 'required|string',
            'parentId' => 'nullable|exists:file_entries,id',
            'relativePath' => 'nullable|string',
            'workspaceId' => 'nullable|int',
            'uploadType' => 'required|string',
            'backendId' => 'required|string',
        ]);

        $payload = new FileEntryPayload($validatedData);
        app(AuthorizeUploadDestination::class)->execute($request, $payload);

        app(S3UploadGrant::class)->verify($payload, $validatedData['filename']);

        $fileEntry = (new CreateFileEntry())->execute($payload);

        $fileEntry = $payload->uploadType->runHandler(
            $fileEntry,
            $validatedData,
        );

        event(new FileUploaded($fileEntry));

        return response()->json(['fileEntry' => $fileEntry]);
    }
}
