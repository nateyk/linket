<?php

namespace Ai\Controllers;

use Ai\AiAgent\Conversations\Streaming\EventEmitter;
use Ai\AiAgent\Flows\AiAgentFlowExecutor;
use App\Conversations\Events\ConversationMessageCreated;
use App\Conversations\Messages\CreateConversationMessage;
use App\Conversations\Models\Conversation;
use Common\Core\BaseController;
use Illuminate\Support\Facades\Validator;

class FlowActionsController extends BaseController
{
    public function goToNode(int $conversationId)
    {
        $conversation = Conversation::findOrFail($conversationId);

        $this->authorize('show', $conversation);

        $validator = Validator::make(request()->all(), [
            'nodeId' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(
                [
                    'errors' => $validator->errors()->messages(),
                ],
                422,
            );
        }

        $data = $validator->validated();

        return $this->stream(function () use ($conversation, $data) {
            EventEmitter::startStream();

            if ($conversation->AiAgentSession?->isActive()) {
                (new AiAgentFlowExecutor($conversation))->execute(
                    targetNodeId: $data['nodeId'],
                );
            }

            EventEmitter::endStream();
        });
    }

    public function setAttributes(int $conversationId)
    {
        $conversation = Conversation::findOrFail($conversationId);

        $this->authorize('show', $conversation);

        // prevent redirection on errors, because response type is not JSON
        $validator = Validator::make(request()->all(), [
            'message' => 'string|nullable',
            'attributes' => 'required|array',
            'attributes.*.name' => 'required|string',
            'attributes.*.type' => 'required|string',
            'attributes.*.value' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(
                [
                    'errors' => $validator->errors()->messages(),
                ],
                422,
            );
        }

        $data = $validator->validated();
        return $this->stream(function () use ($conversation, $data) {
            EventEmitter::startStream();

            if (isset($data['message'])) {
                $message = (new CreateConversationMessage())->execute(
                    $conversation,
                    [
                        'body' => $data['message'],
                        'author' => Conversation::AUTHOR_USER,
                    ],
                );

                event(new ConversationMessageCreated($conversation, $message));
                EventEmitter::messageCreated($message);
            }

            if ($conversation->AiAgentSession?->isActive()) {
                $executor = new AiAgentFlowExecutor($conversation);

                $executor->sessionContext->updateAttributes(
                    $data['attributes'],
                );

                $executor->execute();
            }

            EventEmitter::endStream();
        });
    }
}
