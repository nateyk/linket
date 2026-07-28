<?php

namespace Common\Search\Controllers;

use Common\API\ExcludeRoutesFromPublicDocs;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;

/**
 * @tags NormalizedModels
 */
#[ExcludeRoutesFromPublicDocs]
class NormalizedModelsController extends Controller
{
    /**
     * Retrieve a normalized model.
     *
     * @operationId retrieveNormalizedModel
     *
     * @response array{
     *     data: array{
     *         id: int|string,
     *         name: string,
     *         description?: string|null,
     *         image?: string|null,
     *         model_type?: string,
     *     },
     * }
     */
    public function show(
        string $modelType,
        int $modelId,
        Request $request,
    ): JsonResponse {
        $data = $request->validate([
            'include' => 'string',
        ]);

        $namespace = Relation::getMorphedModel($modelType);
        $include = isset($data['include'])
            ? explode(',', $data['include'])
            : [];

        $model = $namespace::query()->findOrFail($modelId);
        $model->load($include);

        Gate::authorize('show', $model);

        return response()->json(['data' => $model->toNormalizedArray()]);
    }

    /**
     * List normalized models.
     *
     * @operationId listNormalizedModels
     *
     * @response array{
     *     data: list<array{
     *         id: int|string,
     *         name: string,
     *         description?: string|null,
     *         image?: string|null,
     *         model_type?: string,
     *     }>,
     * }
     */
    public function index(string $modelType, Request $request): JsonResponse
    {
        $data = $request->validate([
            'query' => 'string',
            'include' => 'string',
            'modelIds' => 'string',
            'per_page' => 'integer',
        ]);

        $namespace = Relation::getMorphedModel($modelType);
        $query = $data['query'] ?? null;
        $include = isset($data['include'])
            ? explode(',', $data['include'])
            : [];
        $perPage = $data['per_page'] ?? 15;
        $modelIds = isset($data['modelIds'])
            ? explode(',', $data['modelIds'])
            : [];

        Gate::authorize('index', $namespace);

        $model = $namespace::query();

        $results = $model
            ->when($query, fn($q) => $q->mysqlSearch($query))
            ->when($modelIds, fn($q) => $q->whereIn('id', $modelIds))
            ->orderBy('id', 'desc')
            ->take($perPage)
            ->get()
            ->load($include)
            ->map(fn(Model $model) => $model->toNormalizedArray());

        return response()->json(['data' => $results]);
    }
}
