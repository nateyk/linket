<?php

use Ai\AiAgent\Models\AiAgentChunk;
use App\Conversations\Models\Conversation;
use App\HelpCenter\Models\HcArticle;
use App\Models\User;

return [
    'meilisearch' => [
        'index-settings' => [
            AiAgentChunk::class => [
                'displayedAttributes' => [
                    'id',
                    '_vectors',
                    'content',
                    'parent_chunk_id',
                ],
            ],
        ],
    ],
];
