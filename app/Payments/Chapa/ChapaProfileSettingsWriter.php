<?php

declare(strict_types=1);

namespace App\Payments\Chapa;

use App\Storefront\Services\ChapaTransferApprovalSecret;
use Illuminate\Validation\ValidationException;

final class ChapaProfileSettingsWriter
{
    /** @param array<string, string> $values */
    public function save(string $mode, array $values): void
    {
        $this->assertKeyPair($values);
        $this->assertPrefixes($mode, $values);
        $this->assertCleanValues($values);

        if (($values['secret_key'] ?? '') !== '') {
            $this->validateProviderSecret($values['secret_key']);
        }

        $this->persist($mode, $values);
    }

    /** @param array<string, string> $values */
    private function assertKeyPair(array $values): void
    {
        if ((($values['public_key'] ?? '') === '') !== (($values['secret_key'] ?? '') === '')) {
            throw ValidationException::withMessages([
                'secret_key' => __('Enter the public and secret keys together.'),
            ]);
        }
    }

    /** @param array<string, string> $values */
    private function assertPrefixes(string $mode, array $values): void
    {
        $secret = $values['secret_key'] ?? '';
        $public = $values['public_key'] ?? '';
        if ($secret !== '' && ChapaMerchantProfiles::modeForSecret($secret) !== $mode) {
            throw ValidationException::withMessages([
                'secret_key' => __('This key belongs to another Chapa environment or API version.'),
            ]);
        }
        if ($public !== '' && !str_starts_with($public, $mode === 'test' ? 'CHAPUBK_TEST-' : 'CHAPUBK-')) {
            throw ValidationException::withMessages([
                'public_key' => __('Use a matching Chapa v1 public key for this environment.'),
            ]);
        }
    }

    /** @param array<string, string> $values */
    private function assertCleanValues(array $values): void
    {
        foreach ($values as $field => $value) {
            if ($value === '') {
                continue;
            }
            $invalid = trim($value) !== $value;
            $controlCharacters = preg_match('/[\\x00-\\x1F\\x7F]/', $value) === 1;
            if ($invalid || $controlCharacters) {
                throw ValidationException::withMessages([
                    $field => __('Chapa configuration contains invalid whitespace or control characters.'),
                ]);
            }
        }
    }

    public function validateProviderSecret(string $secret): void
    {
        try {
            $status = app(ChapaV2Client::class)->secretStatus($secret);
        } catch (\Throwable) {
            throw ValidationException::withMessages([
                'secret_key' => __('Could not validate the Chapa merchant key with the provider.'),
            ]);
        }
        if ($status !== 'accepted') {
            throw ValidationException::withMessages([
                'secret_key' => __('Chapa rejected this key or its environment.'),
            ]);
        }
    }

    /** @param array<string, string> $values */
    private function persist(string $mode, array $values): void
    {
        $updates = [];
        foreach (['public_key', 'secret_key', 'webhook_secret'] as $field) {
            if (($values[$field] ?? '') !== '') {
                $updates[ChapaMerchantProfiles::key($mode, $field)] = $values[$field];
            }
        }
        if (($values['transfer_approval_secret'] ?? '') !== '') {
            $updates[ChapaTransferApprovalSecret::settingKey($mode)] = $values['transfer_approval_secret'];
        }
        if ($updates !== []) {
            settings()->save($updates);
        }
    }
}
