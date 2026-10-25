<?php

namespace Ai\AiAgent\Tools;

use Ai\AiAgent\Variables\VariableReplacer;
use Ai\AiAgent\Models\AiAgentTool;
use Ai\AiAgent\Models\ToolResponse;
use Ai\AiAgent\Variables\VariableReplacerData;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Http;

class ToolExecutor
{
    protected static $defaultCacheMinutes = 10;

    public static function execute(
        AiAgentTool $tool,
        VariableReplacerData $data,
        bool $throw = false,
    ): ?ToolResponse {
        $tool->increment('activation_count');

        $data = self::prepareRequestData($tool->config['apiRequest'], $data);
        $requestKey = md5(json_encode($data));
        $cachedResponse = ToolResponse::where('type', 'live')
            ->where('request_key', $requestKey)
            ->first();

        if (
            $cachedResponse &&
            $cachedResponse->created_at->diffInMinutes(now()) <
                self::$defaultCacheMinutes
        ) {
            return $cachedResponse;
        }

        $response = Http::withHeaders($data['headers'])
            ->throwIf($throw)
            ->when(
                $data['body'],
                fn(PendingRequest $client) => $client->withBody(
                    $data['body'],
                    $data['contentType'],
                ),
            )
            ->send($data['method'], $data['url']);

        if ($response->successful() && ($body = $response->body())) {
            return ToolResponse::updateOrCreate(
                ['request_key' => $requestKey, 'type' => 'live'],
                [
                    'tool_id' => $tool->id,
                    'response' => $body,
                    'created_at' => now(),
                ],
            );
        }

        return null;
    }

    public static function prepareRequestData(
        array $apiRequestConfig,
        VariableReplacerData $data,
    ) {
        $replacer = new VariableReplacer($data);

        // [["key" => "header", "value" => "value"]] to ["header" => "value"]
        $headers = $apiRequestConfig['headers'] ?? [];
        if (isset($headers[0]) && array_key_exists('key', $headers[0])) {
            $headers = collect($headers)
                ->filter(fn($header) => $header['key'] && $header['value'])
                ->mapWithKeys(
                    fn($header) => [$header['key'] => $header['value']],
                )
                ->toArray();
        }

        // replace variables in headers, body and url
        foreach ($headers as $key => $value) {
            $headers[$key] = $replacer->execute($value);
        }
        $body = isset($apiRequestConfig['body'])
            ? $replacer->execute($apiRequestConfig['body'])
            : null;
        $url = $replacer->execute($apiRequestConfig['url']);

        return [
            'headers' => $headers,
            'body' => $body,
            'contentType' =>
                $apiRequestConfig['bodyType'] === 'json'
                    ? 'application/json'
                    : 'text/plain',
            'method' => $apiRequestConfig['method'] ?? 'GET',
            'url' => $url,
        ];
    }
}
