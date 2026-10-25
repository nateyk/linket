<?php

namespace Ai\AiAgent\Conversations\Data;

class ClassifierResponse
{
    public function __construct(
        public ClassifierStatusCode $code,
        public string $originalUserMessage,
        public string $disambiguatedUserMessage,
    ) {}
}
