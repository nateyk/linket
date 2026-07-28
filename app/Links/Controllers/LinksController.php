<?php

namespace App\Links\Controllers;

use App\Links\Actions\BatchUpdateLinks;
use App\Links\Actions\CrupdateLink;
use App\Links\Actions\DeleteLinks;
use App\Links\Jobs\ExportLinksCsv;
use App\Links\Requests\BulkUpdateLinksRequest;
use App\Links\Requests\CrupdateLinkRequest;
use App\Links\Resources\LinkResource;
use App\Links\QueryBuilder\LinksQueryBuilder;
use App\Links\Models\Link;
use App\Links\Requests\BulkCreateLinksRequest;
use Common\Csv\CsvExport;
use Common\API\ExcludeRouteFromPublicDocs;
use Dedoc\Scramble\Attributes\Group;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;

#[Group('Links', weight: 1)]
class LinksController extends Controller
{
    /**
     * List all links.
     *
     * @operationId listLinks
     */
    public function index(Request $request)
    {
        Gate::authorize('index', Link::class);

        $data = $request->validate([
            'sort' => 'nullable|string',
            'query' => 'nullable|string',
            'per_page' => 'integer|min:1|max:100',
            'page' => 'integer|min:1',
            'include' => 'string',
            'folder_id' => 'integer',
            'workspace_id' => 'string',
            'type' => 'string',
            'is_archived' => 'string',
            'name' => 'string',
            'long_url' => 'string',
            'has_password' => 'string',
            'clicks_count' => 'string',
            'clicked_at' => 'array',
            'expires_at' => 'array',
            'created_at' => 'array',
            'updated_at' => 'array',
            'user_id' => 'integer',
        ]);

        $pagination = (new LinksQueryBuilder($data))->paginate();

        return LinkResource::collection($pagination);
    }

    /**
     * Retrieve a link.
     *
     * @operationId retrieveLink
     */
    public function show(int $id)
    {
        $link = Link::findOrFail($id);

        Gate::authorize('show', $link);

        $link->loadMissing([
            'user',
            'rules',
            'tags',
            'pixels',
            'folder',
            'biolinks',
            'domain',
            'qrCode.linkeable',
        ]);

        return new LinkResource($link);
    }

    /**
     * Create a link.
     *
     * @operationId createLink
     */
    public function store(CrupdateLinkRequest $request)
    {
        Gate::authorize('store', Link::class);

        $link = (new CrupdateLink())->execute($request->all());

        return new LinkResource($link);
    }

    /**
     * Create multiple links.
     *
     * @operationId createMultipleLinks
     */
    public function bulkCreate(BulkCreateLinksRequest $request)
    {
        Gate::authorize('store', Link::class);

        $data = $request->all();

        $longUrls = $data['long_urls'];
        if (is_string($longUrls)) {
            $longUrls = preg_split('/(,|\n)/', $longUrls);
        }

        $multipleUrls = collect($longUrls)
            ->unique()
            ->map(function ($longUrl) use ($data) {
                $data['long_url'] = $longUrl;
                try {
                    return (new CrupdateLink())->execute($data);
                } catch (Exception $e) {
                    if (Arr::get($data, 'stop_on_error')) {
                        throw $e;
                    }
                    Log::error($e->getMessage());
                    return null;
                }
            })
            ->filter();

        return LinkResource::collection($multipleUrls);
    }

    /**
     * Update a link.
     *
     * @operationId updateLink
     */
    public function update(int $id, CrupdateLinkRequest $request)
    {
        $link = Link::findOrFail($id);

        Gate::authorize('update', $link);

        $link = (new CrupdateLink())->execute($request->all(), $link);

        return new LinkResource($link);
    }

    /**
     * Update multiple links.
     *
     * @operationId batchUpdateLinks
     */
    public function bulkUpdate(BulkUpdateLinksRequest $request)
    {
        $data = $request->validated();

        Gate::authorize('update', [new Link(), $data['ids']]);

        (new BatchUpdateLinks())->execute($data['ids'], $data);

        return response()->noContent();
    }

    /**
     * Delete multiple links.
     *
     * @operationId deleteLinks
     */
    public function bulkDelete(Request $request)
    {
        $data = $request->validate([
            // Comma-separated list of link IDs to delete. Maximum of 100 IDs. Non-existing IDs will be ignored.
            'ids' => 'required|string',
        ]);

        $linkIds = array_slice(explode(',', $data['ids']), 0, 100);

        Gate::authorize('destroy', [Link::class, $linkIds]);

        (new DeleteLinks())->execute($linkIds);

        return response()->noContent();
    }

    /**
     * Export links as CSV.
     *
     * @operationId exportLinksCsv
     */
    #[ExcludeRouteFromPublicDocs]
    public function exportCsv(Request $request)
    {
        $this->middleware('auth');

        $data = $request->validate([
            'type' => 'required|string',
            'folderId' => 'nullable|integer',
        ]);

        $forUser = null;
        if (request('type') === 'all') {
            Gate::authorize('index', Link::class);
        } else {
            $forUser = Auth::user();
        }

        return CsvExport::exportUsing(
            new ExportLinksCsv(Auth::id(), $forUser, $data),
        );
    }
}
