<?php

namespace Ai\AiAgent\Tools\EditorSteps;

use Ai\AiAgent\Tools\GenerateResponseSchema;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class TestResponseStep extends BaseStep
{
    public function handle(): array
    {
        $rules = [
            'selectedResponseType' => 'required|string',
            'attributesUsed' => 'array|nullable',
            'attributesUsed.*.name' => 'required|string',
            'attributesUsed.*.testValue' => 'required|string',
        ];

        if (request('selectedResponseType') === 'example') {
            $rules['exampleResponse'] = 'required|string|json';
        } else {
            $rules['liveResponse'] = 'required|string|json';
        }

        $data = $this->validateStep($rules, [
            'liveResponse.required' => __(
                'Validate the API connection with "Test request" button first',
            ),
        ]);
        $exampleResponse = Arr::pull($data, 'exampleResponse');
        $liveResponse = Arr::pull($data, 'liveResponse');

        $this->tool->update([
            'config' => [
                ...$this->tool->config,
                'apiRequest' => [
                    ...$this->tool->config['apiRequest'],
                    'attributesUsed' => $data['attributesUsed'],
                ],
                'selectedResponseType' => $data['selectedResponseType'],
            ],
        ]);

        if ($exampleResponse) {
            $this->tool->responses()->updateOrCreate(
                ['type' => 'editorExample'],
                [
                    'response' => $exampleResponse,
                    'request_key' => Str::random(32),
                ],
            );
        }

        if ($liveResponse) {
            $this->tool->responses()->updateOrCreate(
                ['type' => 'editorLive'],
                [
                    'response' => $liveResponse,
                    'request_key' => Str::random(32),
                ],
            );
        }

        $response = $liveResponse ?? $exampleResponse;
        if ($response) {
            $schema = (new GenerateResponseSchema())->execute(
                json_decode($response, true),
            );

            if ($schema) {
                $this->tool->update([
                    'response_schema' => $schema,
                ]);
            } else {
                $key = $liveResponse ? 'liveResponse' : 'exampleResponse';
                throw ValidationException::withMessages([
                    $key => __('Invalid response schema'),
                ]);
            }
        }

        return $this->tool->toArrayWithResponses();
    }
}
