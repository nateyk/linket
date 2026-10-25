<?php

namespace Ai\AiAgent\Ingest\Files;

use Ai\AiAgent\Models\AiAgentDocument;
use Common\Files\Actions\ValidateFileUpload;
use Common\Files\FileEntry;
use Common\Files\Middleware\FileUploadMiddlewareContract;
use Illuminate\Support\Collection;

class AiAgentDocumentUploadMiddleware implements FileUploadMiddlewareContract
{
    public function validate(array $data): Collection|null
    {
        return (new ValidateFileUpload(
            allowedExtensions: [
                'pdf',
                'doc',
                'docx',
                'ppt',
                'pptx',
                'xls',
                'xlsx',
                'csv',
                'json',
                'xml',
                'txt',
            ],
            maxSize: 40 * 1024 * 1024, // 40MB,
        ))->execute($data);
    }

    public function handle(FileEntry $fileEntry, array $data): FileEntry
    {
        $document = AiAgentDocument::create([
            'file_entry_id' => $fileEntry->id,
            'language' => $data['documentLanguage'] ?? 'en',
        ]);

        IngestAiAgentDocumentJob::dispatch($document);

        return $fileEntry;
    }
}
