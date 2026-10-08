<?php

namespace Common\Help\Http\Controllers;

use Common\Help\Http\Resources\HelpArticleResource;
use Common\Help\Models\HelpArticle;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;

class AdminHelpArticleController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('admin.access');

        $articles = HelpArticle::query()
            ->when($request->filled('search'), function ($query) use ($request) {
                $searchTerm = '%'.$request->input('search').'%';
                $query->where('title', 'like', $searchTerm)
                    ->orWhere('slug', 'like', $searchTerm)
                    ->orWhere('body', 'like', $searchTerm)
                    ->orWhere('short_description', 'like', $searchTerm);
            })
            ->when($request->filled('category'), function ($query) use ($request) {
                $query->where('help_category_id', $request->input('category'));
            })
            ->with('category')
            ->orderByDesc('id')
            ->paginate((int) $request->input('perPage', 15));

        return HelpArticleResource::collection($articles);
    }

    public function store(Request $request)
    {
        Gate::authorize('admin.access');

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'alpha_dash', 'max:255', 'unique:help_articles,slug'],
            'help_category_id' => ['required', 'integer', 'exists:help_categories,id'],
            'body' => ['required', 'string'],
            'short_description' => ['required', 'string', 'max:200'],
        ]);

        $article = new HelpArticle();
        $article->title = $data['title'];
        $article->slug = $data['slug']
            ?? HelpArticle::generateUniqueSlug($data['title'], 'slug');
        $article->body = $data['body'];
        $article->short_description = $data['short_description'];
        $article->help_category_id = $data['help_category_id'];
        $article->save();

        return (new HelpArticleResource($article->load('category')))
            ->response()
            ->setStatusCode(201);
    }

    public function show(HelpArticle $article)
    {
        Gate::authorize('admin.access');

        return new HelpArticleResource($article->load('category'));
    }

    public function update(Request $request, HelpArticle $article)
    {
        Gate::authorize('admin.access');

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'alpha_dash', 'max:255', "unique:help_articles,slug,{$article->id}"],
            'help_category_id' => ['required', 'integer', 'exists:help_categories,id'],
            'body' => ['required', 'string'],
            'short_description' => ['required', 'string', 'max:200'],
        ]);

        $article->title = $data['title'];
        $article->slug = $data['slug'];
        $article->body = $data['body'];
        $article->short_description = $data['short_description'];
        $article->help_category_id = $data['help_category_id'];
        $article->save();

        return new HelpArticleResource($article->load('category'));
    }

    public function destroy(HelpArticle $article)
    {
        Gate::authorize('admin.access');

        $article->delete();

        return response()->json(['message' => __('Deleted successfully.')]);
    }
}
