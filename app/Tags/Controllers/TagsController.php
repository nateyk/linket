<?php

namespace App\Tags\Controllers;

use App\Tags\Models\Tag;
use App\Tags\TagsQueryBuilder;
use App\Tags\Resources\TagResource;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

/**
 * @tags Tags
 */
class TagsController extends Controller
{
    /**
     * List all tags.
     *
     * @operationId listTags
     */
    public function index(Request $request)
    {
        Gate::authorize('index', Tag::class);

        $data = $request->validate([
            'query' => 'nullable|string',
            'per_page' => 'integer|min:1|max:100',
            'page' => 'integer|min:1',
            'sort' => 'string',
            'workspace_id' => 'string',
            'user_id' => 'integer',
            'created_at' => 'string',
            'updated_at' => 'string',
        ]);

        $pagination = (new TagsQueryBuilder($data))->paginate();

        return TagResource::collection($pagination);
    }

    /**
     * Create a tag.
     *
     * @operationId createTag
     */
    public function store(Request $request)
    {
        Gate::authorize('store', Tag::class);

        $data = $request->validate([
            'name' => [
                'required',
                'string',
                'max:100',
                Rule::unique('tags', 'name')->where(
                    'workspace_id',
                    ActiveWorkspace::get()->id,
                ),
            ],
        ]);

        $tag = Tag::create([
            'name' => $data['name'],
            'user_id' => Auth::id(),
        ]);

        return new TagResource($tag);
    }

    /**
     * Update a tag.
     *
     * @operationId updateTag
     */
    public function update(int $id, Request $request)
    {
        $tag = Tag::findOrFail($id);

        Gate::authorize('update', $tag);

        $data = $request->validate([
            'name' => [
                'string',
                'max:100',
                Rule::unique('tags', 'name')
                    ->where('workspace_id', ActiveWorkspace::get()->id)
                    ->ignore($id),
            ],
        ]);

        $tag->fill($data)->save();

        return new TagResource($tag);
    }

    /**
     * Delete tags.
     *
     * @operationId deleteTags
     */
    public function bulkDelete(Request $request)
    {
        $data = $request->validate([
            // Comma-separated list of tag IDs to delete. Maximum of 100 IDs. Non-existing IDs will be ignored.
            'ids' => 'required|string',
        ]);

        $tagIds = array_slice(explode(',', $data['ids']), 0, 100);

        Gate::authorize('destroy', [Tag::class, $tagIds]);

        Tag::whereIn('id', $tagIds)->delete();
        DB::table('taggables')->whereIn('tag_id', $tagIds)->delete();

        return response()->noContent();
    }
}
