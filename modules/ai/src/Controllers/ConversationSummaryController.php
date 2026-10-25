<?php

namespace Ai\Controllers;

use Ai\Summary\CreateConversationSummary;
use App\Conversations\Models\Conversation;
use Common\Core\BaseController;

class ConversationSummaryController extends BaseController
{
    public function show(int $conversationId)
    {
        $conversation = Conversation::with('user')->findOrFail($conversationId);

        $this->authorize('show', $conversation);

        $summary = $conversation
            ->summary()
            ->with('user')
            ->first();

        return $this->success(['summary' => $summary]);
    }

    public function destroy(int $conversationId)
    {
        $conversation = Conversation::findOrFail($conversationId);

        $this->authorize('update', $conversation);

        $conversation->summary()->delete();

        return $this->success();
    }

    public function generate(int $conversationId)
    {
        $conversation = Conversation::findOrFail($conversationId);

        $this->authorize('update', $conversation);

        $summary = (new CreateConversationSummary())->execute($conversation);

        return $this->success([
            'summary' => $summary,
        ]);
    }
}
