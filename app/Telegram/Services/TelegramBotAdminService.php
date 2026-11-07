<?php

namespace App\Telegram\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

final class TelegramBotAdminService
{
    public function ensureWebhook(): void
    {
        $this->syncWebhook();
    }

    public function reply(int $chatId, string $text): void
    {
        if ($chatId <= 0 || $text === '') {
            return;
        }

        try {
            $this->request('sendMessage', [
                'chat_id' => $chatId,
                'text' => $text,
                'disable_web_page_preview' => true,
            ]);
        } catch (\Throwable) {
            // The /start update is already stored. A failed reply must not make Telegram retry it.
        }
    }

    /** @return array<string, mixed> */
    public function syncWebhook(): array
    {
        $this->assertConfigured();

        $this->request('setWebhook', [
            'url' => $this->webhookUrl(),
            'secret_token' => (string) \App\Telegram\Support\TelegramSettings::get('webhook_secret'),
            'allowed_updates' => ['message'],
        ]);

        $response = $this->request('getWebhookInfo');

        return $this->safeWebhook(
            is_array($response['result'] ?? null) ? $response['result'] : [],
        );
    }

    /** @return array<string, mixed> */
    public function inspect(): array
    {
        $this->assertConfigured();

        $identity = $this->request('getMe');
        $webhookInfo = $this->request('getWebhookInfo');
        $bot = is_array($identity['result'] ?? null) ? $identity['result'] : [];
        $remoteUsername = is_string($bot['username'] ?? null) ? $bot['username'] : '';
        $configuredUsername = ltrim((string) \App\Telegram\Support\TelegramSettings::get('bot_username'), '@');
        $webhook = $this->safeWebhook(
            is_array($webhookInfo['result'] ?? null) ? $webhookInfo['result'] : [],
        );
        $identityMatches = $remoteUsername !== ''
            && strcasecmp($configuredUsername, $remoteUsername) === 0;
        $urlMatches = hash_equals($this->webhookUrl(), $webhook['url']);
        $updatesMatch = in_array('message', $webhook['allowed_updates'], true);
        $healthy = $identityMatches && $urlMatches && $updatesMatch
            && $webhook['last_error_date'] === null
            && $webhook['last_synchronization_error_date'] === null;

        return [
            'status' => $healthy ? 'healthy' : 'degraded',
            'bot' => [
                'id' => is_numeric($bot['id'] ?? null) ? (int) $bot['id'] : null,
                'username' => $remoteUsername,
                'identity_matches' => $identityMatches,
            ],
            'webhook' => [
                ...$webhook,
                'url_matches' => $urlMatches,
                'updates_match' => $updatesMatch,
            ],
        ];
    }

    /** @return array<string, mixed> */
    private function request(string $method, array $payload = []): array
    {
        $token = (string) \App\Telegram\Support\TelegramSettings::get('token');
        $timeout = max(1.0, (float) config('services.telegram.http.timeout', 10));
        $connectTimeout = max(
            1.0,
            (float) config('services.telegram.http.connect_timeout', 5),
        );

        try {
            $response = Http::acceptJson()
                ->timeout($timeout)
                ->connectTimeout($connectTimeout)
                ->post(
                    "https://api.telegram.org/bot{$token}/{$method}",
                    $payload,
                )
                ->throw();

            $decoded = $response->json();

            if (! is_array($decoded) || ($decoded['ok'] ?? false) !== true) {
                throw new \RuntimeException('Unexpected Telegram response.');
            }

            return $decoded;
        } catch (\Throwable) {
            throw ValidationException::withMessages([
                'telegram' => __('Telegram could not be reached. Check the server configuration and try again.'),
            ]);
        }
    }

    private function assertConfigured(): void
    {
        if (! \App\Telegram\Support\TelegramSettings::isOperational()) {
            throw ValidationException::withMessages([
                'telegram' => __('Telegram server configuration is incomplete.'),
            ]);
        }

        $secret = (string) \App\Telegram\Support\TelegramSettings::get('webhook_secret');
        if (! preg_match('/^[A-Za-z0-9_-]{1,256}$/D', $secret)
            || ! str_starts_with($this->webhookUrl(), 'https://')) {
            throw ValidationException::withMessages([
                'telegram' => __('Telegram webhook configuration must use HTTPS and a valid secret token.'),
            ]);
        }
    }

    private function webhookUrl(): string
    {
        return url('integrations/telegram/webhook');
    }

    /**
     * @param  array<string, mixed>  $result
     * @return array<string, mixed>
     */
    private function safeWebhook(array $result): array
    {
        return [
            'url' => is_string($result['url'] ?? null)
                ? $result['url']
                : '',
            'has_custom_certificate' => (bool) (
                $result['has_custom_certificate'] ?? false
            ),
            'pending_update_count' => max(
                0,
                (int) ($result['pending_update_count'] ?? 0),
            ),
            'allowed_updates' => array_values(array_filter(
                is_array($result['allowed_updates'] ?? null)
                    ? $result['allowed_updates']
                    : [],
                static fn (mixed $update): bool => is_string($update),
            )),
            'last_error_date' => isset($result['last_error_date'])
                ? (int) $result['last_error_date']
                : null,
            'last_synchronization_error_date' => isset($result['last_synchronization_error_date'])
                ? (int) $result['last_synchronization_error_date']
                : null,
            'max_connections' => isset($result['max_connections'])
                ? max(0, (int) $result['max_connections'])
                : null,
        ];
    }
}
