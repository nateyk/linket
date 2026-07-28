<?php

namespace App\LinkOverlays\Controllers;

use App\LinkOverlays\Actions\DeleteLinkOverlays;
use App\LinkOverlays\Models\LinkOverlay;
use App\LinkOverlays\QueryBuilder\LinkOverlaysQueryBuilder;
use App\LinkOverlays\Requests\CrupdateLinkOverlayRequest;
use App\LinkOverlays\Resources\LinkOverlayResource;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;

/**
 * @tags Link Overlays
 */
class LinkOverlaysController extends Controller
{
    /**
     * List all link overlays.
     *
     * @operationId listLinkOverlays
     */
    public function index(Request $request)
    {
        Gate::authorize('index', LinkOverlay::class);

        $data = $request->validate([
            'query' => 'string',
            'per_page' => 'integer|min:1|max:100',
            'page' => 'integer|min:1',
            'sort' => 'string',
            'workspace_id' => 'string',
            'user_id' => 'integer',
            'name' => 'string',
            'theme' => 'string',
            'is_archived' => 'string',
            'created_at' => 'string',
            'updated_at' => 'string',
        ]);

        $pagination = (new LinkOverlaysQueryBuilder($data))->paginate();

        return LinkOverlayResource::collection($pagination);
    }

    /**
     * Retrieve a link overlay.
     *
     * @operationId retrieveLinkOverlay
     */
    public function show(int $id)
    {
        $linkOverlay = LinkOverlay::findOrFail($id);

        Gate::authorize('show', $linkOverlay);

        return new LinkOverlayResource($linkOverlay);
    }

    /**
     * Create a link overlay.
     *
     * @operationId createLinkOverlay
     */
    public function store(CrupdateLinkOverlayRequest $request)
    {
        Gate::authorize('store', LinkOverlay::class);

        $linkOverlay = LinkOverlay::create([
            ...$request->validated(),
            'user_id' => Auth::id(),
        ]);

        return new LinkOverlayResource($linkOverlay);
    }

    /**
     * Update a link overlay.
     *
     * @operationId updateLinkOverlay
     */
    public function update(int $id, CrupdateLinkOverlayRequest $request)
    {
        $linkOverlay = LinkOverlay::findOrFail($id);

        Gate::authorize('update', $linkOverlay);

        $linkOverlay->fill($request->validated())->save();

        return new LinkOverlayResource($linkOverlay);
    }

    /**
     * Delete link overlays.
     *
     * @operationId deleteLinkOverlays
     */
    public function bulkDelete(Request $request)
    {
        $data = $request->validate([
            // Comma-separated list of link overlay IDs to delete. Maximum of 100 IDs. Non-existing IDs will be ignored.
            'linkOverlayIds' => 'required|string',
        ]);

        $linkOverlayIds = array_slice(
            explode(',', $data['linkOverlayIds']),
            0,
            100,
        );

        Gate::authorize('destroy', [LinkOverlay::class, $linkOverlayIds]);

        (new DeleteLinkOverlays())->execute($linkOverlayIds);

        return response()->noContent();
    }

    /**
     * Archive link overlays.
     *
     * @operationId archiveLinkOverlays
     */
    public function bulkArchive(Request $request)
    {
        $data = $request->validate([
            // Comma-separated list of link overlay IDs to archive. Maximum of 100 IDs. Non-existing IDs will be ignored.
            'ids' => 'required|string',
        ]);

        $ids = array_slice(explode(',', $data['ids']), 0, 100);

        Gate::authorize('destroy', [LinkOverlay::class, $ids]);

        LinkOverlay::query()->whereIn('id', $ids)->delete();

        return response()->noContent();
    }

    /**
     * Unarchive link overlays.
     *
     * @operationId unarchiveLinkOverlays
     */
    public function bulkUnarchive(Request $request)
    {
        $data = $request->validate([
            // Comma-separated list of link overlay IDs to unarchive. Maximum of 100 IDs. Non-existing IDs will be ignored.
            'ids' => 'required|string',
        ]);

        $ids = array_slice(explode(',', $data['ids']), 0, 100);

        Gate::authorize('destroy', [LinkOverlay::class, $ids]);

        LinkOverlay::onlyTrashed()->whereIn('id', $ids)->restore();

        return response()->noContent();
    }
}
