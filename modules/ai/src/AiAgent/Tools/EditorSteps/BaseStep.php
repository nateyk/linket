<?php

namespace Ai\AiAgent\Tools\EditorSteps;

use Ai\AiAgent\Models\AiAgentTool;
use Illuminate\Contracts\Validation\Factory;

abstract class BaseStep
{
    public function __construct(protected AiAgentTool $tool) {}

    protected function validateStep(
        array $rules,
        array $messages = [],
        array $attributes = [],
    ): array {
        return app(Factory::class)
            ->make(request()->all(), $rules, $messages, $attributes)
            ->validate();
    }

    abstract public function handle(): array;

    public static function getHandler(string $step, AiAgentTool $tool): self
    {
        return match ($step) {
            'general' => new GeneralStep($tool),
            'api-connection' => new ApiConnectionStep($tool),
            'test-response' => new TestResponseStep($tool),
            'attribute-mapping' => new AttributeMappingStep($tool),
        };
    }
}
