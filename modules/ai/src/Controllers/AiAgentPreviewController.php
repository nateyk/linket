<?php

namespace Ai\Controllers;

use App\Conversations\Agent\Actions\DeleteMultipleConversations;
use App\Conversations\Models\Conversation;
use Common\Core\BaseController;

class AiAgentPreviewController extends BaseController
{
    public function deleteConversation(int $conversationId)
    {
        $conversation = Conversation::where(
            'mode',
            Conversation::MODE_PREVIEW,
        )->findOrFail($conversationId);

        $this->authorize('show', $conversation);

        (new DeleteMultipleConversations())->execute([$conversation->id]);

        return response()->json();
    }
}
