<?php

namespace Common\Help\Http\Controllers;

use Common\Help\Http\Resources\HelpCategoryResource;
use Common\Help\Models\HelpCategory;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;

class AdminHelpCategoryController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('admin.access');

        $categories = HelpCategory::query()
            ->when($request->filled('search'), function ($query) use ($request) {
                $searchTerm = '%'.$request->input('search').'%';
                $query->where('name', 'like', $searchTerm)
                    ->orWhere('slug', 'like', $searchTerm);
            })
            ->withCount('articles')
            ->get();

        return HelpCategoryResource::collection($categories);
    }

    public function store(Request $request)
    {
        Gate::authorize('admin.access');

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'alpha_dash', 'max:255', 'unique:help_categories,slug'],
        ]);

        $category = new HelpCategory();
        $category->name = $data['name'];
        $category->slug = $data['slug']
            ?? HelpCategory::generateUniqueSlug($data['name'], 'slug');
        $category->sort_id = (int) HelpCategory::query()->max('sort_id') + 1;
        $category->save();

        return (new HelpCategoryResource($category))
            ->response()
            ->setStatusCode(201);
    }

    public function show(HelpCategory $category)
    {
        Gate::authorize('admin.access');

        return new HelpCategoryResource($category->loadCount('articles'));
    }

    public function update(Request $request, HelpCategory $category)
    {
        Gate::authorize('admin.access');

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'alpha_dash', 'max:255', "unique:help_categories,slug,{$category->id}"],
        ]);

        $category->name = $data['name'];
        $category->slug = $data['slug'];
        $category->save();

        return new HelpCategoryResource($category);
    }

    public function destroy(HelpCategory $category)
    {
        Gate::authorize('admin.access');

        if ($category->articles()->exists()) {
            return response()->json([
                'message' => __('The selected category has articles, it cannot be deleted.'),
            ], 422);
        }

        $category->delete();

        return response()->json(['message' => __('Deleted successfully.')]);
    }

    public function sort(Request $request)
    {
        Gate::authorize('admin.access');

        $data = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer', 'exists:help_categories,id'],
        ]);

        foreach ($data['ids'] as $sortOrder => $id) {
            HelpCategory::withoutGlobalScope(\Common\Help\Scopes\SortByIdScope::class)
                ->where('id', $id)
                ->update(['sort_id' => $sortOrder + 1]);
        }

        return response()->json(['message' => __('Sorted successfully.')]);
    }
}
