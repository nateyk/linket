<?php

namespace Common\Files\Controllers;

use Illuminate\Support\Facades\Auth;
use Common\Core\Demo\BlockedOnDemoSite;
use Common\Files\Actions\CreateFileEntry;
use Common\Files\Actions\Deletion\DeleteEntries;
use Common\Files\Actions\StoreFile;
use Common\Files\Events\FileUploaded;
use Common\Files\FileEntry;
use Common\Files\FileEntryPayload;
use Common\Files\Actions\FileUploadValidator;
use Common\Files\QueryBuilder\FileEntriesQueryBuilder;
use Common\Files\Resources\FileEntryResource;
use Common\Files\Response\FileResponseFactory;
use Illuminate\Contracts\Filesystem\FileNotFoundException;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Http\UploadedFile;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;

/**
 * @tags Files
 */
class FileEntriesController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth')->only(['index']);
    }

    /**
     * List all file entries.
     *
     * @operationId listFileEntries
     */
    public function index(Request $request)
    {
        $data = $request->validate([
            'query' => 'nullable|string',
            'per_page' => 'integer|min:1|max:100',
            'page' => 'integer|min:1',
            'sort' => 'string',
            'include' => 'string',
            'fields_preset' => 'string',
            'type' => 'string',
            'public' => 'string',
            'owner_id' => 'string',
            'created_at' => 'string',
            'updated_at' => 'string',
        ]);

        Gate::authorize('index', FileEntry::class);

        $pagination = (new FileEntriesQueryBuilder($data))->paginate();

        return FileEntryResource::collection($pagination);
    }

    /**
     * Retrieve file entry content.
     *
     * @operationId retrieveFileEntryContent
     */
    public function show(int $id, FileResponseFactory $response)
    {
        $fileEntry = FileEntry::query()->findOrFail($id);

        Gate::authorize('show', $fileEntry);
        $this->abortUnlessCourseVideoAccessible($fileEntry);

        try {
            return $response->create($fileEntry);
        } catch (FileNotFoundException $e) {
            abort(404);
        }
    }

    /**
     * Retrieve file entry model.
     *
     * @operationId retrieveFileEntryModel
     */
    public function showModel(int $id)
    {
        $fileEntry = FileEntry::query()->findOrFail($id);

        Gate::authorize('show', $fileEntry);
        $this->abortUnlessCourseVideoAccessible($fileEntry);

        return new FileEntryResource($fileEntry);
    }

    /**
     * Uploaded lesson videos stream only through signed lesson-video URLs.
     * Course managers keep raw access for builder preview; everyone else
     * (including enrolled buyers) must use the signed path.
     */
    private function abortUnlessCourseVideoAccessible(FileEntry $fileEntry): void
    {
        if ($fileEntry->upload_type !== 'courseVideos') {
            return;
        }

        $lesson = \App\Courses\Models\Lesson::query()->where('video_file_entry_id', $fileEntry->id)->first();
        if ($lesson === null) {
            return;
        }

        $user = request()->user('sanctum') ?? request()->user('web') ?? request()->user() ?? Auth::user();
        abort_unless($user && app(\App\Courses\CourseAccess::class)->canPreviewCourse($user, $lesson->course), 403);
    }

    /**
     * Upload a file.
     *
     * @operationId simpleFileUpload
     */
    public function store(Request $request)
    {
        $parentId = (int) request('parentId') ?: null;
        request()->merge(['parentId' => $parentId]);

        Gate::authorize('store', [FileEntry::class, request('parentId')]);

        $file = $request->file('file');
        $payload = new FileEntryPayload($request->all());
        $detectedMime = $file instanceof UploadedFile
            ? ($file->getMimeType() ?: $payload->clientMime)
            : $payload->clientMime;
        $validationMime = $payload->uploadType->name === 'digitalProductFiles'
            ? $detectedMime
            : $payload->clientMime;

        $request->validate([
            'file' => [
                'required',
                'file',
                function ($attribute, UploadedFile $value, $fail) use (
                    $payload,
                    $validationMime,
                ) {
                    $errors = FileUploadValidator::validateForUploadType(
                        $payload->uploadType,
                        $payload->size,
                        $payload->clientExtension,
                        $validationMime,
                    );
                    if ($errors) {
                        $fail($errors->first());
                    }
                },
            ],
            'parentId' => 'nullable|exists:file_entries,id',
            'relativePath' => 'nullable|string',
        ]);

        if (
            $payload->uploadType->name === 'digitalProductFiles' &&
            $payload->workspaceId
        ) {
            $payload->clientMime = $detectedMime;
            app(\App\Entitlements\AssertDigitalProductUploadAllowed::class)
                ->execute($payload->size, $payload->workspaceId);
            app(\App\Storefront\ProductSettings::class)
                ->enforceFileSizePolicy($payload->size);
        }

        (new StoreFile())->execute($payload, ['file' => $file]);

        $fileEntry = (new CreateFileEntry())->execute($payload);
        $fileEntry = $payload->uploadType->runHandler(
            $fileEntry,
            $request->all(),
        );

        event(new FileUploaded($fileEntry));

        return response()->json([
            'fileEntry' => new FileEntryResource(
                $fileEntry->loadMissing('users'),
            ),
        ]);
    }

    /**
     * Update file entry.
     *
     * @operationId updateFileEntry
     */
    public function update(int $entryId, Request $request)
    {
        $entry = FileEntry::query()->findOrFail($entryId);

        Gate::authorize('update', $entry);

        $data = $request->validate([
            'name' => 'string|min:3|max:200',
            'description' => 'nullable|string|min:3|max:200',
        ]);

        $entry->fill($data)->update();

        return new FileEntryResource($entry->loadMissing('users'));
    }

    /**
     * Bulk delete file entries.
     *
     * @operationId bulkDeleteFileEntries
     */
    #[BlockedOnDemoSite]
    public function bulkDelete(Request $request)
    {
        $userId = Auth::id();

        $request->validate([
            'entryIds' => 'array|max:100',
            'entryIds.*' => 'required|int',
            'paths' => 'array|max:100',
            'deleteForever' => 'boolean',
            'emptyTrash' => 'boolean',
        ]);

        // get all soft deleted entries for user, if we are emptying trash
        if ($request->boolean('emptyTrash')) {
            $entryIds = FileEntry::query()
                ->where('owner_id', $userId)
                ->onlyTrashed()
                ->pluck('id')
                ->toArray();
        } else {
            $entryIds = $request->array('entryIds');
        }

        app(DeleteEntries::class)->execute([
            'paths' => $request->array('paths'),
            'entryIds' => $entryIds,
            'soft' =>
                !$request->boolean('deleteForever', true) &&
                !$request->boolean('emptyTrash'),
        ]);

        return response()->noContent();
    }
}
