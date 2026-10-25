<?php

namespace Ai\AiAgent\Tools\EditorSteps;

use Ai\AiAgent\Models\AiAgentTool;
use Ai\AiAgent\Variables\VariableReplacer;
use Illuminate\Support\Arr;

class ApiConnectionStep extends BaseStep
{
    public function handle(): array
    {
        $data = $this->validateStep(
            [
                'url' => 'required|string',
                'headers' => 'array',
                'headers.*.key' => 'required|string|max:200',
                'headers.*.value' => 'required|string|max:200',
                'method' => 'required|string',
                'bodyType' => 'string|max:20',
                'body' => 'string|nullable',
                'collectedData' => 'array',
            ],
            [
                'headers.*.value.required' => __(
                    'Header value can\'t be empty',
                ),
                'headers.*.key.required' => __('Header key can\'t be empty'),
            ],
        );

        $data['attributesUsed'] = $this->getAttributesUsedInRequest($data);

        $this->tool->config = [
            ...$this->tool->config ?? [],
            'apiRequest' => $data,
        ];

        $this->tool->save();

        return $this->tool->toArrayWithResponses();
    }

    protected function getAttributesUsedInRequest(array $data): array
    {
        $attributes = [
            ...$this->getVariablesFromText($data['url']),
            ...$this->getVariablesFromText($data['body']),
        ];

        foreach ($data['headers'] as $header) {
            $attributes = array_merge(
                $attributes,
                $this->getVariablesFromText($header['value']),
            );
        }

        return $attributes;
    }

    protected function getVariablesFromText(string|null $text): array
    {
        if (!$text) {
            return [];
        }

        preg_match_all(VariableReplacer::$regex, $text, $matches);

        return Arr::map(
            $matches[0],
            fn($match, $index) => [
                'name' => $matches[1][$index],
                'type' => $matches[2][$index],
                'fallback' => $matches[3][$index],
            ],
        );
    }
}
