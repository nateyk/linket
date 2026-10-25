<?php

namespace Ai\AiAgent\Flows\Controllers;

use Ai\AiAgent\Models\AiAgentFlow;
use Common\Files\FileEntry;

class FlowAttachmentsController
{
    public function index(int $flowId)
    {
        $flow = AiAgentFlow::findOrFail($flowId);

        $attachments = $flow->files()->limit(50)->get()->map(
            fn(FileEntry $entry) => [
                'id' => $entry->id,
                'name' => $entry->name,
                'type' => $entry->type,
                'thumbnail' => $entry->thumbnail,
                'file_size' => $entry->file_size,
                'hash' => $entry->hash,
                'file_name' => $entry->file_name,
                'url' => $entry->url,
            ],
        );

        return response()->json([
            'attachments' => $attachments,
        ]);
    }

    public function destroy(int $flowId, int $attachmentId)
    {
        $flow = AiAgentFlow::find($flowId);
        $flow->files()->detach($attachmentId);

        return response()->json();
    }
}
