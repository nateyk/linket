<?php namespace App\HelpCenter\Controllers;

use App\Core\Modules;
use App\Core\WidgetFlags;
use App\HelpCenter\Actions\CrupdateArticle;
use App\HelpCenter\Actions\DeleteMultipleArticles;
use App\HelpCenter\Actions\HcArticleLoader;
use App\HelpCenter\Actions\PerformArticleBatchAction;
use App\HelpCenter\Jobs\IncrementArticleViews;
use App\HelpCenter\Models\HcArticle;
use App\HelpCenter\Requests\ModifyHcArticle;
use Common\Core\BaseController;
use Common\Database\Datasource\Datasource;
use Common\Database\Datasource\DatasourceFilters;
use Common\Files\FileEntry;
use Common\Files\Response\DownloadFilesResponse;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Session;

class HcArticleController extends BaseController
{
    public function index()
    {
        $this->authorize('index', HcArticle::class);

        $isAgent = Auth::user()?->isAgent();

        $builder = HcArticle::query()
            ->with(['author', 'tags'])
            ->when(
                Modules::aiInstalled(),
                fn($q) => $q->with([
                    'aiAgents' => fn($q) => $q->select(['ai_agents.id']),
                ]),
            )
            ->when(
                request('articleIds'),
                fn($q) => $q->whereIn(
                    'id',
                    explode(',', request('articleIds')),
                ),
            )
            ->when(!$isAgent, fn($q) => $q->visibleToAudience())
            ->select([
                'articles.id',
                'articles.title',
                'articles.slug',
                'articles.draft',
                'articles.author_id',
                'articles.updated_at',
            ]);

        $filters = new DatasourceFilters(request('filters'));

        if ($filter = $filters->getAndRemove('used_by_ai_agent')) {
            if (request('aiAgentId')) {
                $builder->whereRelation(
                    'aiAgents',
                    'ai_agents.id',
                    $filter['value'] ? '=' : '!=',
                    request('aiAgentId'),
                );
            } elseif ($filter['value']) {
                $builder->whereHas('aiAgents');
            } else {
                $builder->whereDoesntHave('aiAgents');
            }
        }

        $datasource = new Datasource(
            $builder,
            request()->except('with'),
            filters: $filters,
        );

        $pagination = $datasource->paginate();

        $pagination->setCollection(
            $pagination->getCollection()->loadPath()->map(
                fn(HcArticle $article) => [
                    'id' => $article->id,
                    'title' => $article->title,
                    'slug' => $article->slug,
                    'draft' => $article->draft,
                    'author' => $article->author
                        ? [
                            'id' => $article->author->id,
                            'name' => $article->author->name,
                            'image' => $article->author->image,
                        ]
                        : null,
                    'tags' => $article->tags->pluck('name'),
                    'updated_at' => $article->updated_at,
                    'used_by_ai_agent' => request('aiAgentId')
                        ? $article->aiAgents->contains(
                            'id',
                            (int) request('aiAgentId'),
                        )
                        : $article->aiAgents->isNotEmpty(),
                    'path' => $article->path,
                ],
            ),
        );

        return $this->success([
            'pagination' => $pagination,
        ]);
    }

    public function show()
    {
        $this->authorize('index', HcArticle::class);
        // The loader authorizes the model before returning body or editor data.
        $data = (new HcArticleLoader())->loadData(request('loader'));
        $articleId = $data['article']['id'];

        if (
            request('loader') === 'articlePage' &&
            IncrementArticleViews::shouldIncrement($articleId)
        ) {
            $timestamp = now()->timestamp;
            dispatch(
                new IncrementArticleViews(
                    $data['article']['id'],
                    Auth::id(),
                    $timestamp,
                ),
            );
            Session::put("articleViews.$articleId", $timestamp);
        }

        return $this->renderClientOrApi([
            'data' => $data,
            'pageName' => 'article-page',
        ]);
    }

    public function update(HcArticle $article, ModifyHcArticle $request)
    {
        $this->authorize('update', $article);

        $article = (new CrupdateArticle())->execute(
            $request->validated(),
            $article,
        );

        return $this->success(['article' => $article]);
    }

    public function store(ModifyHcArticle $request)
    {
        $this->authorize('store', HcArticle::class);

        $article = (new CrupdateArticle())->execute($request->validated());

        return $this->success(['article' => $article], 201);
    }

    public function destroy(string $ids)
    {
        $ids = explode(',', $ids);
        $this->authorize('destroy', HcArticle::class);
        if (count($ids) > 1000 ||
            collect($ids)->contains(fn ($id) => ! ctype_digit($id) || (int) $id < 1)) {
            abort(422, 'Invalid article IDs.');
        }

        $this->blockOnDemoSite();

        (new DeleteMultipleArticles())->execute($ids);

        return $this->success();
    }

    public function performBatchAction()
    {
        $this->authorize('update', HcArticle::class);

        $data = request()->validate([
            'articleIds' => 'required|array|min:1|max:1000',
            'articleIds.*' => 'required|integer|min:1|distinct|exists:articles,id',
            'action' => 'required|in:changeArticleStatus,changeVisibility',
            'data' => 'required|array',
            'data.status' => 'required_if:action,changeArticleStatus|in:draft,published',
            'data.roleId' => 'nullable|integer|min:1|exists:roles,id',
        ]);

        (new PerformArticleBatchAction())->execute(
            $data['articleIds'],
            $data['action'],
            $data['data'],
        );

        return $this->success();
    }
}
