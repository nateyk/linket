<?php

namespace Ai\AiAgent\Flows\Uploads;

use Ai\AiAgent\Models\AiAgentFlow;
use Common\Files\Actions\ValidateFileUpload;
use Common\Files\FileEntry;
use Common\Files\Middleware\FileUploadMiddlewareContract;
use Illuminate\Support\Collection;

class FlowAttachmentsUploadMiddleware implements FileUploadMiddlewareContract
{
    public function validate(array $data): Collection|null
    {
        return (new ValidateFileUpload(
            maxSize: 10 * 1024 * 1024, // 10MB,
        ))->execute($data);
    }

    public function handle(FileEntry $fileEntry, array $data): FileEntry
    {
        $flow = AiAgentFlow::find($data['flowId']);
        $flow->files()->attach($fileEntry);

        return $fileEntry;
    }
}
