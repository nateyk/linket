<?php

namespace Ai\Controllers;

use Ai\AiAgent\Models\AiAgentDocument;
use Common\Core\BaseController;
use Common\Database\Datasource\Datasource;
use Illuminate\Support\Facades\DB;

class AiAgentDocumentsController extends BaseController
{
    public function index()
    {
        $this->authorize('update', 'aiAgent');

        $datasource = new Datasource(
            AiAgentDocument::with([
                'fileEntry' => fn($q) => $q->select([
                    'id',
                    'name',
                    'mime',
                    'type',
                ]),
            ]),
            request()->all(),
        );

        return $this->success([
            'pagination' => $datasource->paginate(),
        ]);
    }

    public function show(int $documentId)
    {
        $this->authorize('update', 'aiAgent');

        $document = AiAgentDocument::with('fileEntry')->findOrFail($documentId);

        return $this->success([
            'document' => $document,
        ]);
    }

    public function destroy(string $documentIds)
    {
        $this->authorize('update', 'aiAgent');

        DB::transaction(function () use ($documentIds) {
            AiAgentDocument::deleteMultiple(explode(',', $documentIds));
        });

        return $this->success();
    }
}
