<?php

namespace App\Payments\VerifyEt;

use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;
use InvalidArgumentException;
use JsonException;

final class EncryptedProviderEvidence implements CastsAttributes
{
    public function get(Model $model, string $key, mixed $value, array $attributes): ?array
    {
        if ($value === null) {
            return null;
        }
        $decoded = json_decode((string) $value, true, 512, JSON_THROW_ON_ERROR);
        if (is_array($decoded) && is_string($decoded['_verify_et_encrypted_v1'] ?? null)) {
            $decoded = json_decode(Crypt::decryptString($decoded['_verify_et_encrypted_v1']), true, 512, JSON_THROW_ON_ERROR);
        }
        if (!is_array($decoded)) {
            throw new JsonException('Invalid stored provider evidence.');
        }

        return $decoded;
    }

    public function set(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        if ($value === null) {
            return null;
        }
        if (!is_array($value)) {
            throw new InvalidArgumentException('Provider evidence must be an array.');
        }

        return json_encode([
            '_verify_et_encrypted_v1' => Crypt::encryptString(json_encode($value, JSON_THROW_ON_ERROR)),
        ], JSON_THROW_ON_ERROR);
    }
}
