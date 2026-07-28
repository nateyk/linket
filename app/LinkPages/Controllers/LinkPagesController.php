<?php

namespace App\LinkPages\Controllers;

use App\LinkPages\Actions\CrupdateLinkPage;
use App\LinkPages\Models\LinkPage;
use App\LinkPages\QueryBuilder\LinkPagesQueryBuilder;
use App\LinkPages\Requests\CrupdateLinkPageRequest;
use App\LinkPages\Resources\LinkPageResource;
use App\Links\Models\Link;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;

/**
 * @tags Link Pages
 */
class LinkPagesController extends Controller
{
    /**
     * List all link pages.
     *
     * @operationId listLinkPages
     */
    public function index(Request $request)
    {
        Gate::authorize('index', LinkPage::class);

        $data = $request->validate([
            'query' => 'nullable|string',
            'per_page' => 'integer|min:1|max:100',
            'page' => 'integer|min:1',
            'sort' => 'string',
            'workspace_id' => 'string',
            'user_id' => 'integer',
            'name' => 'string',
            'is_archived' => 'string',
            'created_at' => 'string',
            'updated_at' => 'string',
        ]);

        $pagination = (new LinkPagesQueryBuilder($data))->paginate();

        return LinkPageResource::collection($pagination);
    }

    /**
     * Retrieve a link page.
     *
     * @operationId retrieveLinkPage
     */
    public function show(int $id)
    {
        $linkPage = LinkPage::findOrFail($id);

        Gate::authorize('show', $linkPage);

        $linkPage->loadMissing('user');

        return new LinkPageResource($linkPage);
    }

    /**
     * Create a link page.
     *
     * @operationId createLinkPage
     */
    public function store(CrupdateLinkPageRequest $request)
    {
        Gate::authorize('store', LinkPage::class);

        $linkPage = (new CrupdateLinkPage())->execute(
            new LinkPage(),
            $request->validated(),
        );

        return new LinkPageResource($linkPage);
    }

    /**
     * Update a link page.
     *
     * @operationId updateLinkPage
     */
    public function update(int $id, CrupdateLinkPageRequest $request)
    {
        $linkPage = LinkPage::findOrFail($id);

        Gate::authorize('update', $linkPage);

        $linkPage = (new CrupdateLinkPage())->execute(
            $linkPage,
            $request->validated(),
        );

        return new LinkPageResource($linkPage);
    }

    /**
     * Delete link pages.
     *
     * @operationId deleteLinkPages
     */
    public function bulkDelete(Request $request)
    {
        $data = $request->validate([
            // Comma-separated list of link page IDs to delete. Maximum of 100 IDs. Non-existing IDs will be ignored.
            'ids' => 'required|string',
        ]);

        $linkPageIds = array_slice(explode(',', $data['ids']), 0, 100);

        Gate::authorize('destroy', [LinkPage::class, $linkPageIds]);

        $pages = LinkPage::query()->whereIn('id', $linkPageIds)->get();

        Link::query()
            ->where('type', 'page')
            ->whereIn('type_id', $linkPageIds)
            ->update(['type_id' => null, 'type' => 'direct']);

        $pages->each(function ($page) {
            $page->inlineImages()->detach();
            $page->delete();
        });

        return response()->noContent();
    }

    /**
     * Archive link pages.
     *
     * @operationId archiveLinkPages
     */
    public function bulkArchive(Request $request)
    {
        $data = $request->validate([
            // Comma-separated list of link page IDs to archive. Maximum of 100 IDs. Non-existing IDs will be ignored.
            'ids' => 'required|string',
        ]);

        $linkPageIds = array_slice(explode(',', $data['ids']), 0, 100);

        Gate::authorize('destroy', [LinkPage::class, $linkPageIds]);

        LinkPage::query()->whereIn('id', $linkPageIds)->delete();

        return response()->noContent();
    }

    /**
     * Unarchive link pages.
     *
     * @operationId unarchiveLinkPages
     */
    public function bulkUnarchive(Request $request)
    {
        $data = $request->validate([
            // Comma-separated list of link page IDs to unarchive. Maximum of 100 IDs. Non-existing IDs will be ignored.
            'ids' => 'required|string',
        ]);

        $linkPageIds = array_slice(explode(',', $data['ids']), 0, 100);

        Gate::authorize('destroy', [LinkPage::class, $linkPageIds]);

        LinkPage::onlyTrashed()->whereIn('id', $linkPageIds)->restore();

        return response()->noContent();
    }
}
