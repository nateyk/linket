<?php

namespace App\Telegram\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

final class TelegramBotAdminService
{
    /** @return array<string, mixed> */
    public function syncWebhook(): array
    {
        $this->assertConfigured();

        $this->request('setWebhook', [
            'url' => $this->webhookUrl(),
            'secret_token' => (string) config('services.telegram.webhook_secret'),
            'allowed_updates' => ['message'],
        ]);

        $response = $this->request('getWebhookInfo');

        return $this->safeWebhook(
            is_array($response['result'] ?? null) ? $response['result'] : [],
        );
    }

    /** @return array<string, mixed> */
    private function request(string $method, array $payload = []): array
    {
        $token = (string) config('services.telegram.token');
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
        if (
            ! config('services.telegram.enabled') ||
            blank(config('services.telegram.token')) ||
            blank(config('services.telegram.bot_username')) ||
            blank(config('services.telegram.webhook_secret'))
        ) {
            throw ValidationException::withMessages([
                'telegram' => __('Telegram server configuration is incomplete.'),
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
        ];
    }
}
