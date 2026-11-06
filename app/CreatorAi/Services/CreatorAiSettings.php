<?php

namespace App\CreatorAi\Services;

use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;
use RuntimeException;

final class CreatorAiSettings
{
    /** @return array<string, int|string|bool> Public, secret-free configuration. */
    public function publicConfig(): array
    {
        $policy = $this->policy();

        return [
            'enabled' => $policy['enabled'],
            'provider' => $policy['provider'],
            'api_key_configured' => $policy['api_key_configured'],
            'free_monthly_limit' => $policy['free_monthly_limit'],
            'pro_monthly_limit' => $policy['pro_monthly_limit'],
            'provider_monthly_budget_microusd' => $policy['provider_monthly_budget_microusd'],
            'per_request_reservation_microusd' => $policy['per_request_reservation_microusd'],
            'currency' => 'USD',
            'microusd_per_usd' => 1000000,
        ];
    }

    /** @return array{enabled:bool,provider:string,api_key_configured:bool,free_monthly_limit:int,pro_monthly_limit:int,provider_monthly_budget_microusd:int,per_request_reservation_microusd:int} */
    public function policy(): array
    {
        $values = $this->decryptStored();

        return [
            'enabled' => (bool) ($values['enabled'] ?? false),
            'provider' => (string) ($values['provider'] ?? 'openai'),
            'api_key_configured' => filled($values['api_key'] ?? null),
            'free_monthly_limit' => (int) ($values['free_monthly_limit'] ?? config('creator_ai.free_monthly_generation_requests', 10)),
            'pro_monthly_limit' => (int) ($values['pro_monthly_limit'] ?? config('creator_ai.pro_monthly_generation_requests', 100)),
            // Zero budgets fail closed, even if an AI feature flag is enabled.
            'provider_monthly_budget_microusd' => (int) ($values['provider_monthly_budget_microusd'] ?? 0),
            'per_request_reservation_microusd' => (int) ($values['per_request_reservation_microusd'] ?? 0),
        ];
    }

    /**
     * Internal server-only access for the later native AI provider adapter.
     * Never return this value to controllers, tools, logs or clients.
     */
    public function apiKey(): ?string
    {
        $value = $this->decryptStored()['api_key'] ?? null;

        return filled($value) ? (string) $value : null;
    }

    /** @param array<string, mixed> $input */
    public function update(array $input): void
    {
        $keys = [
            'enabled', 'provider', 'api_key',
            'free_monthly_limit', 'pro_monthly_limit',
            'provider_monthly_budget_microusd', 'per_request_reservation_microusd',
        ];

        if (array_diff(array_keys($input), $keys) !== []) {
            throw new InvalidArgumentException('Unsupported Creator AI configuration key.');
        }

        foreach (['enabled'] as $name) {
            if (array_key_exists($name, $input) && ! is_bool($input[$name])) {
                throw new InvalidArgumentException('Creator AI enabled must be boolean.');
            }
        }

        if (array_key_exists('provider', $input) && $input['provider'] !== 'openai') {
            throw ValidationException::withMessages(['provider' => 'Only the vetted OpenAI provider is supported in this release.']);
        }

        foreach ([
            'free_monthly_limit' => 100000,
            'pro_monthly_limit' => 100000,
            'provider_monthly_budget_microusd' => 1000000000000,
            'per_request_reservation_microusd' => 10000000000,
        ] as $key => $maximum) {
            if (array_key_exists($key, $input) &&
                (! is_int($input[$key]) || $input[$key] < 0 || $input[$key] > $maximum)) {
                throw ValidationException::withMessages([$key => 'Invalid Creator AI spending or quota limit.']);
            }
        }

        if (array_key_exists('api_key', $input)) {
            if ($input['api_key'] === null || $input['api_key'] === '') {
                unset($input['api_key']);
            } elseif (! is_string($input['api_key']) || strlen($input['api_key']) > 4096) {
                throw ValidationException::withMessages(['api_key' => 'Invalid provider credential.']);
            }
        }

        DB::transaction(function () use ($input): void {
            $row = DB::table('creator_ai_settings')->where('id', 1)->lockForUpdate()->first();
            if (! $row) {
                throw new RuntimeException('Creator AI settings must be migrated before use.');
            }

            $existing = json_decode(Crypt::decryptString($row->encrypted_config), true, 512, JSON_THROW_ON_ERROR);
            if (! is_array($existing)) {
                throw new RuntimeException('Invalid encrypted Creator AI configuration.');
            }

            $next = [...$existing, ...$input];
            if ((bool) ($next['enabled'] ?? false)) {
                if (
                    blank($next['api_key'] ?? null)
                    || ($next['provider'] ?? 'openai') !== 'openai'
                    || (int) ($next['provider_monthly_budget_microusd'] ?? 0) < 1
                    || (int) ($next['per_request_reservation_microusd'] ?? 0) < 1
                    || (int) ($next['per_request_reservation_microusd'] ?? 0)
                        > (int) ($next['provider_monthly_budget_microusd'] ?? 0)
                ) {
                    throw ValidationException::withMessages([
                        'enabled' => 'Configure a provider key and positive, consistent spending limits before enabling AI generation.',
                    ]);
                }
            }

            DB::table('creator_ai_settings')->where('id', 1)->update([
                'encrypted_config' => Crypt::encryptString(json_encode($next, JSON_THROW_ON_ERROR)),
                'updated_at' => now(),
            ]);
        }, 3);
    }

    /** @return array<string, mixed> */
    private function decryptStored(): array
    {
        $ciphertext = DB::table('creator_ai_settings')->where('id', 1)->value('encrypted_config');

        if (! is_string($ciphertext) || $ciphertext === '') {
            throw new RuntimeException('Creator AI settings are missing; fail closed.');
        }

        $data = json_decode(Crypt::decryptString($ciphertext), true, 512, JSON_THROW_ON_ERROR);

        if (! is_array($data)) {
            throw new RuntimeException('Creator AI encrypted configuration is malformed.');
        }

        return $data;
    }
}
