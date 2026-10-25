<?php

namespace Ai\Summary;

use Ai\AiAgent\Models\ConversationSummary;
use App\Conversations\Models\Conversation;
use Common\AI\Llm;
use Common\AI\Providers\ProviderParams;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Laravel\Prompts\Prompt;

class CreateConversationSummary
{
    public function execute(Conversation $conversation): ConversationSummary
    {
        $messages = $conversation
            ->messages()
            ->whereNotNull('user_id')
            ->limit(30)
            ->latest()
            ->get()
            ->map(function ($message) {
                $author = $message->author === 'user' ? 'Customer' : 'Agent';
                $message = $message->body;
                return "{$author}: {$message} \n\n";
            })
            ->reverse()
            ->join('');

        if (strlen($messages) < 600) {
            throw ValidationException::withMessages([
                'conversation' => __(
                    'Conversation needs to be longer to generate a summary.',
                ),
            ]);
        }

        $schema = [
            'name' => 'summary',
            'description' => 'Summary of the conversation',
            'schema' => [
                'type' => 'object',
                'properties' => [
                    'summary' => [
                        'type' => 'array',
                        'items' => [
                            'type' => 'string',
                        ],
                        'description' => 'Summary of the conversation',
                    ],
                    'keywords' => [
                        'type' => 'array',
                        'items' => [
                            'type' => 'string',
                        ],
                        'description' =>
                            '3 keywords extracted from the conversation',
                    ],
                    'sentiment' => [
                        'type' => 'string',
                        'description' =>
                            'Overall customer sentiment of the conversation',
                    ],
                ],
                'required' => ['summary', 'keywords', 'sentiment'],
                'additionalProperties' => false,
            ],
        ];

        $response = Llm::resolveProvider(
            new ProviderParams(
                temperature: 0.5,
                maxTokens: 4000,
                schema: $schema,
                systemPrompt: 'You are an assistant helping helpdesk agent summarize conversation content.',
                prompt: "Concisely summarize specified conversation content. Summary should contain at most 5 items, less if possible, without losing content. Also generate 3 top keywords and overall customer sentiment. \n\n **Conversation content:** \n\n $messages",
            ),
        )->generateText();

        $data = json_decode($response->output, true);

        $conversation->summary()->delete();
        return $conversation
            ->summary()
            ->create([
                'content' => $data,
                'generated_by' => Auth::id(),
            ])
            ->load('user');
    }
}
