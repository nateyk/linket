<?php

use Ai\AiAgent\Ingest\Files\AiAgentDocumentUploadMiddleware;
use Ai\AiAgent\Flows\Uploads\FlowAttachmentsUploadMiddleware;

return [
    'AiAgentDocuments' => AiAgentDocumentUploadMiddleware::class,
    'flowAttachments' => FlowAttachmentsUploadMiddleware::class,
];
