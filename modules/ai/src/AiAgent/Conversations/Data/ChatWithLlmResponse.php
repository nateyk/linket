<?php

namespace Ai\AiAgent\Conversations\Data;

use Illuminate\Support\Collection;

class ChatWithLlmResponse
{
    public function __construct(
        public string $output,
        public Collection $matchingChunks,
    ) {}
}
