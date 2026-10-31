<?php

namespace App\Payments\VerifyEt;

use JsonException;

final class VerifyEtJson
{
    /** @return array<string, mixed> */
    public function decode(string $json): array
    {
        json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        preg_match_all('~"(?:\\\\.|[^"\\\\])*"|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?|[\[\]{}:,]|true|false|null|\s+~', $json, $matches);
        $tokens = $matches[0];
        $previous = null;
        $beforePrevious = null;
        foreach ($tokens as &$token) {
            if (trim($token) === '') {
                continue;
            }
            if ($previous === ':' && is_string($beforePrevious) && str_starts_with($beforePrevious, '"')
                && json_decode($beforePrevious, true) === 'amount'
                && preg_match('/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?$/D', $token)) {
                $token = json_encode($token, JSON_THROW_ON_ERROR);
            }
            $beforePrevious = $previous;
            $previous = $token;
        }
        unset($token);

        $decoded = json_decode(implode('', $tokens), true, 512, JSON_THROW_ON_ERROR | JSON_BIGINT_AS_STRING);
        if (!is_array($decoded) || array_is_list($decoded)) {
            throw new JsonException('Invalid provider envelope.');
        }

        return $decoded;
    }
}
