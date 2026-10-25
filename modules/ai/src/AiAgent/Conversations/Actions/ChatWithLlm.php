<?php

namespace Ai\AiAgent\Conversations\Actions;

use Ai\AiAgent\Conversations\Data\ChatWithLlmResponse;
use Ai\AiAgent\Conversations\Data\ClassifierResponse;
use Ai\AiAgent\Conversations\Data\ClassifierStatusCode;
use Ai\AiAgent\Conversations\Streaming\EventEmitter;
use Ai\AiAgent\Models\AiAgentChunk;
use Ai\AiAgent\Models\AiAgentVector;
use Common\AI\Llm;
use Common\AI\Providers\ProviderParams;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\View;
use App\Core\WidgetFlags;

class ChatWithLlm
{
    public function execute(
        ClassifierResponse $response,
        Collection $messages,
        Collection $tools,
    ): ChatWithLlmResponse {
        // only need knowledge if user actually asked a question or needs assistance
        $matchingChunks =
            $response->code === ClassifierStatusCode::Assistance
                ? $this->findMatchingChunks($response->disambiguatedUserMessage)
                : collect();

        $systemPrompt = View::make('prompts::chat-with-llm', [
            'knowledge' => $matchingChunks,
            'cantAssistInstruction' => settings(
                'aiAgent.cantAssist.instruction',
            ),
        ])->render();

        EventEmitter::debug('chatWithLLmPrompt', [
            'prompt' => $systemPrompt,
            'chunks' => $matchingChunks,
            'classifierCode' => $response->code,
            'vectorQuery' => $response->disambiguatedUserMessage,
        ]);

        $stream = Llm::resolveProvider(
            new ProviderParams(
                systemPrompt: $systemPrompt,
                messages: $messages,
                tools: $tools,
            ),
        )->generateTextStream();

        $fullResponse = '';
        foreach ($stream as $chunk) {
            $fullResponse .= $chunk;
            EventEmitter::responseDelta($chunk);
        }

        EventEmitter::endDeltaStream();

        EventEmitter::debug('chatWithLLmResponse', [
            'response' => $fullResponse,
        ]);

        return new ChatWithLlmResponse($fullResponse, $matchingChunks);
    }

    protected function findMatchingChunks(string $message)
    {
        $messageHash = AiAgentChunk::hashContent($message);
        $userMessageVector = AiAgentVector::where(
            'content_hash',
            $messageHash,
        )->first();

        if (!$userMessageVector) {
            $embedding = Llm::resolveEmbeddingProvider()->generateEmbeddings(
                $message,
            );
            $userMessageVector = AiAgentVector::create([
                'content_hash' => $messageHash,
                'vector' => json_encode($embedding->embeddings[0]),
                'vector_tokens_used' => $embedding->usage->totalTokens,
            ]);
        }

        $categoryId = WidgetFlags::scopedHcCategoryId();
        $chunks = AiAgentChunk::searchUsingVector(
            json_decode($userMessageVector->vector),
            limit: 20,
            categoryIds: $categoryId ? [$categoryId] : null,
        )
            ->take(8)
            ->values();

        EventEmitter::debug('chunks', [
            'chunks' => $chunks->toArray(),
        ]);

        return $chunks;
    }
}
