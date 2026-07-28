<?php

namespace Common\Search\Controllers;

use Common\Core\Demo\BlockedOnDemoSite;
use Common\Search\ImportRecordsIntoScout;
use Common\API\ExcludeRoutesFromPublicDocs;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Str;

/**
 * @tags Settings
 */
#[ExcludeRoutesFromPublicDocs]
class SearchSettingsController extends Controller
{
    /**
     * Get searchable models.
     *
     * @operationId getSearchableModels
     *
     * @response array{models: list<array{model: string, name: string}>}
     */
    public function getSearchableModels()
    {
        $models = ImportRecordsIntoScout::getSearchableModels();

        $models = array_map(function (string $model) {
            return [
                'model' => $model,
                'name' => Str::plural(last(explode('\\', $model))),
            ];
        }, $models);

        return response()->json(['models' => $models]);
    }

    /**
     * Import records into scout.
     *
     * @operationId importRecordsIntoScout
     */
    #[BlockedOnDemoSite]
    public function import(Request $request)
    {
        $this->middleware('isAdmin');

        $data = $request->validate([
            'model' => ['string', 'required'],
            'driver' => ['string', 'required'],
        ]);

        (new ImportRecordsIntoScout())->execute(
            $data['model'],
            $data['driver'],
        );

        return response()->json(['output' => nl2br(Artisan::output())]);
    }
}
