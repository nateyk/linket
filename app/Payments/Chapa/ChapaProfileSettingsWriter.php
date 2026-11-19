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
        $profile = new ChapaProfileConfiguration($mode, $values);
        $this->assertKeyPair($profile->values);
        $this->assertPrefixes($profile);
        $this->assertCleanValues($profile->values);

        if (($values['secret_key'] ?? '') !== '') {
            $this->validateProviderSecret($values['secret_key']);
        }

        $this->persist($profile);
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

    private function assertPrefixes(ChapaProfileConfiguration $profile): void
    {
        $secret = $profile->values['secret_key'] ?? '';
        $public = $profile->values['public_key'] ?? '';
        $mode = $profile->mode;
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
            if ($this->containsInvalidCharacters($value)) {
                throw ValidationException::withMessages([
                    $field => __('Chapa configuration contains invalid whitespace or control characters.'),
                ]);
            }
        }
    }

    private function containsInvalidCharacters(string $value): bool
    {
        if (trim($value) !== $value) {
            return true;
        }

        return preg_match('/[\\x00-\\x1F\\x7F]/', $value) === 1;
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

    private function persist(ChapaProfileConfiguration $profile): void
    {
        $updates = [];
        $mode = $profile->mode;
        $values = $profile->values;
        foreach (['public_key', 'secret_key', 'webhook_secret'] as $field) {
            if (($values[$field] ?? '') !== '') {
                $updates[ChapaMerchantProfiles::key($mode, $field)] = $values[$field];
            }
        }
        $this->saveApprovalSecret($profile, $updates);
    }

    /** @param array<string, string> $updates */
    private function saveApprovalSecret(ChapaProfileConfiguration $profile, array $updates): void
    {
        if (($profile->values['transfer_approval_secret'] ?? '') !== '') {
            $updates[ChapaTransferApprovalSecret::settingKey($profile->mode)] = $profile->values['transfer_approval_secret'];
        }
        if ($updates !== []) {
            settings()->save($updates);
        }
    }
}
