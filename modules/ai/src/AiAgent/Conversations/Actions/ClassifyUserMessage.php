<?php

namespace Ai\AiAgent\Conversations\Actions;

use Ai\AiAgent\Conversations\Data\ClassifierResponse;
use Ai\AiAgent\Conversations\Data\ClassifierStatusCode;
use Ai\AiAgent\Conversations\Streaming\EventEmitter;
use Common\AI\Llm;
use Common\AI\Providers\ProviderParams;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\View;

class ClassifyUserMessage
{
    public function execute(
        Collection $messages,
        Collection $flowsWithIntent,
    ): ClassifierResponse {
        $prompt = View::make('prompts::classify-user-message')
            ->with('flowsWithIntent', $flowsWithIntent)
            ->render();

        EventEmitter::debug('classifier.prompt', [
            'prompt' => $prompt,
        ]);

        $response = Llm::resolveProvider(
            new ProviderParams(
                systemPrompt: $prompt,
                messages: $messages,
                schema: $this->getSchema(),
            ),
        )->generateText();

        $json = json_decode($response->output, true);

        EventEmitter::debug('classifier.response', $json);

        return new ClassifierResponse(
            ClassifierStatusCode::from($json['code']),
            $messages->last()->content,
            $json['userMessage'],
        );
    }

    protected function getSchema(): array
    {
        return [
            'name' => 'response_with_code',
            'description' => 'Response with code and user message',
            'schema' => [
                'type' => 'object',
                'properties' => [
                    'code' => [
                        'type' => 'string',
                        'description' => 'One of the provided codes',
                    ],
                    'userMessage' => [
                        'type' => 'string',
                        'description' => 'Disambiguated user message',
                    ],
                ],
                'required' => ['code', 'userMessage'],
                'additionalProperties' => false,
            ],
        ];
    }
}
