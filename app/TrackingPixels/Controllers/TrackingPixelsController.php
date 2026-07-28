<?php

namespace App\TrackingPixels\Controllers;

use App\TrackingPixels\Actions\CrupdateTrackingPixel;
use App\TrackingPixels\Actions\DeleteTrackingPixels;
use App\TrackingPixels\Models\TrackingPixel;
use App\TrackingPixels\QueryBuilder\TrackingPixelsQueryBuilder;
use App\TrackingPixels\Requests\CrupdateTrackingPixelRequest;
use App\TrackingPixels\Resources\TrackingPixelResource;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;

/**
 * @tags Tracking Pixels
 */
class TrackingPixelsController extends Controller
{
    /**
     * List all tracking pixels.
     *
     * @operationId listTrackingPixels
     */
    public function index(Request $request)
    {
        Gate::authorize('index', TrackingPixel::class);

        $data = $request->validate([
            'query' => 'nullable|string',
            'per_page' => 'integer|min:1|max:100',
            'page' => 'integer|min:1',
            'sort' => 'string',
            'workspace_id' => 'string',
            'user_id' => 'integer',
            'type' => 'string',
            'name' => 'string',
            'is_archived' => 'string',
            'created_at' => 'string',
            'updated_at' => 'string',
        ]);

        $pagination = (new TrackingPixelsQueryBuilder($data))->paginate();

        return TrackingPixelResource::collection($pagination);
    }

    /**
     * Retrieve a tracking pixel.
     *
     * @operationId retrieveTrackingPixel
     */
    public function show(int $id)
    {
        $trackingPixel = TrackingPixel::findOrFail($id);

        Gate::authorize('show', $trackingPixel);

        return new TrackingPixelResource($trackingPixel);
    }

    /**
     * Create a tracking pixel.
     *
     * @operationId createTrackingPixel
     */
    public function store(CrupdateTrackingPixelRequest $request)
    {
        Gate::authorize('store', TrackingPixel::class);

        $pixel = (new CrupdateTrackingPixel())->execute($request->validated());

        return new TrackingPixelResource($pixel);
    }

    /**
     * Update a tracking pixel.
     *
     * @operationId updateTrackingPixel
     */
    public function update(int $id, CrupdateTrackingPixelRequest $request)
    {
        $trackingPixel = TrackingPixel::findOrFail($id);

        Gate::authorize('update', $trackingPixel);

        $pixel = (new CrupdateTrackingPixel())->execute(
            $request->validated(),
            $trackingPixel,
        );

        return new TrackingPixelResource($pixel);
    }

    /**
     * Delete tracking pixels.
     *
     * @operationId deleteTrackingPixels
     */
    public function bulkDelete(Request $request)
    {
        $data = $request->validate([
            // Comma-separated list of tracking pixel IDs to delete. Maximum of 100 IDs. Non-existing IDs will be ignored.
            'trackingPixelIds' => 'required|string',
        ]);

        $trackingPixelIds = array_slice(
            explode(',', $data['trackingPixelIds']),
            0,
            100,
        );

        Gate::authorize('destroy', [TrackingPixel::class, $trackingPixelIds]);

        (new DeleteTrackingPixels())->execute($trackingPixelIds);

        return response()->noContent();
    }

    /**
     * Archive tracking pixels.
     *
     * @operationId archiveTrackingPixels
     */
    public function bulkArchive(Request $request)
    {
        $data = $request->validate([
            // Comma-separated list of tracking pixel IDs to archive. Maximum of 100 IDs. Non-existing IDs will be ignored.
            'ids' => 'required|string',
        ]);

        $ids = array_slice(explode(',', $data['ids']), 0, 100);

        Gate::authorize('destroy', [TrackingPixel::class, $ids]);

        TrackingPixel::query()->whereIn('id', $ids)->delete();

        return response()->noContent();
    }

    /**
     * Unarchive tracking pixels.
     *
     * @operationId unarchiveTrackingPixels
     */
    public function bulkUnarchive(Request $request)
    {
        $data = $request->validate([
            // Comma-separated list of tracking pixel IDs to unarchive. Maximum of 100 IDs. Non-existing IDs will be ignored.
            'ids' => 'required|string',
        ]);

        $ids = array_slice(explode(',', $data['ids']), 0, 100);

        Gate::authorize('destroy', [TrackingPixel::class, $ids]);

        TrackingPixel::onlyTrashed()->whereIn('id', $ids)->restore();

        return response()->noContent();
    }
}
