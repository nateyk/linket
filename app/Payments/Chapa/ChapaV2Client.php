<?php

namespace App\Payments\Chapa;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

final class ChapaV2Client
{
    public function __construct(
        private string $baseUrl = 'https://api.chapa.global/v2',
    ) {}

    /**
     * @param array{
     *     amount_cents: int,
     *     currency: string,
     *     merchant_reference: string,
     *     idempotency_key: string,
     *     callback_url?: string|null,
     *     return_url?: string|null,
     *     customer?: array<string, string>|null,
     *     customization?: array<string, string>|null,
     *     meta?: array<string, string>|null
     * } $payment
     * @return array{checkout_url: string, chapa_reference: string|null}
     */
    public function createHostedPayment(string $secret, array $payment): array
    {
        if ($payment['amount_cents'] < 100) {
            throw new RuntimeException('Chapa amount is below the minimum.');
        }

        if (strlen($payment['merchant_reference']) > 20) {
            throw new RuntimeException('Chapa merchant reference exceeds 20 characters.');
        }

        $body = array_filter([
            'amount' => $payment['amount_cents'],
            'currency' => $payment['currency'],
            'merchant_reference' => $payment['merchant_reference'],
            'callback_url' => $payment['callback_url'] ?? null,
            'return_url' => $payment['return_url'] ?? null,
            'customer' => $payment['customer'] ?? null,
            'customization' => $payment['customization'] ?? null,
            'meta' => $payment['meta'] ?? null,
        ], fn (mixed $value): bool => $value !== null);

        $response = $this->send($secret, $payment['idempotency_key'])
            ->post($this->baseUrl.'/payments/hosted', $body);

        $payload = $this->jsonOrFail($response);
        $checkoutUrl = data_get($payload, 'data.checkout_url');
        if (!is_string($checkoutUrl) || $checkoutUrl === '') {
            throw new RuntimeException('Chapa did not return a checkout URL.');
        }

        return [
            'checkout_url' => $checkoutUrl,
            'chapa_reference' => $this->referenceFromCheckoutUrl($checkoutUrl),
        ];
    }

    /**
     * @param array{
     *     amount_cents: int,
     *     currency: string,
     *     merchant_reference: string,
     *     idempotency_key: string,
     *     account: array{account_number: string, account_name: string, bank_slug: string},
     *     reason?: string|null
     * } $payout
     * @return array<string, mixed>
     */
    public function createPayout(string $secret, array $payout): array
    {
        if ($payout['amount_cents'] < 100) {
            throw new RuntimeException('Chapa amount is below the minimum.');
        }

        if (strlen($payout['merchant_reference']) > 20) {
            throw new RuntimeException('Chapa merchant reference exceeds 20 characters.');
        }

        $response = $this->send($secret, $payout['idempotency_key'])
            ->post($this->baseUrl.'/payouts', array_filter([
                'amount' => $payout['amount_cents'],
                'currency' => $payout['currency'],
                'merchant_reference' => $payout['merchant_reference'],
                'account' => $payout['account'],
                'reason' => $payout['reason'] ?? null,
            ], fn (mixed $value): bool => $value !== null));

        $data = (array) ($this->jsonOrFail($response)['data'] ?? []);
        if (!is_string($data['chapa_reference'] ?? null) || $data['chapa_reference'] === '') {
            throw new RuntimeException('Chapa payout did not return a reference.');
        }

        return $data;
    }

    /** @return array<string, mixed> */
    public function verifyPayout(string $secret, string $reference): array
    {
        $response = $this->send($secret)
            ->get($this->baseUrl.'/payouts/'.rawurlencode($reference).'/verify');

        return (array) ($this->jsonOrFail($response)['data'] ?? []);
    }

    /** @return array<int, mixed> */
    public function payoutBanks(string $secret): array
    {
        $response = $this->send($secret)->get($this->baseUrl.'/payouts/banks');
        $banks = $this->jsonOrFail($response)['data'] ?? null;
        if (!is_array($banks)) {
            throw new RuntimeException('Chapa banks fetch failed.');
        }

        return $banks;
    }

    /** @return array<string, mixed> */
    public function verifyPayment(string $secret, string $reference): array
    {
        $response = $this->send($secret)
            ->get($this->baseUrl.'/payments/'.rawurlencode($reference).'/verify');

        $payload = $this->jsonOrFail($response);

        return (array) ($payload['data'] ?? []);
    }

    public function secretAuthenticates(string $secret): bool
    {
        $response = $this->request($secret)->get($this->baseUrl.'/payments/methods');

        if (in_array($response->status(), [401, 403], true)) {
            return false;
        }

        $this->jsonOrFail($response);

        return true;
    }

    public static function centsFromMajor(string $amount): int
    {
        if (!preg_match('/^\d+(\.\d{1,2})?$/', $amount)) {
            throw new RuntimeException('Invalid Chapa amount.');
        }

        return (int) bcmul($amount, '100', 0);
    }

    public static function majorFromCents(int $cents): string
    {
        return bcdiv((string) $cents, '100', 2);
    }

    private function send(string $secret, ?string $idempotencyKey = null): PendingRequest
    {
        $request = $this->request($secret)
            ->retry([100, 500], 0, fn (Throwable $exception): bool => $this->shouldRetry($exception))
            ->throw();

        if ($idempotencyKey !== null) {
            $request = $request->withHeaders(['Idempotency-Key' => $idempotencyKey]);
        }

        return $request;
    }

    private function request(string $secret): PendingRequest
    {
        return Http::withToken($secret)
            ->acceptJson()
            ->connectTimeout(3)
            ->timeout(10);
    }

    private function shouldRetry(Throwable $exception): bool
    {
        return $exception instanceof ConnectionException
            || ($exception instanceof RequestException
                && ($exception->response->serverError() || $exception->response->status() === 429));
    }

    /** @return array<string, mixed> */
    private function jsonOrFail(Response $response): array
    {
        if (!$response->successful()) {
            throw new RuntimeException('Chapa request failed.');
        }

        $payload = $response->json();
        if (!is_array($payload) || ($payload['status'] ?? null) !== 'success') {
            throw new RuntimeException('Chapa request failed.');
        }

        return $payload;
    }

    private function referenceFromCheckoutUrl(string $checkoutUrl): ?string
    {
        $reference = basename((string) parse_url($checkoutUrl, PHP_URL_PATH));

        return $reference !== '' ? $reference : null;
    }
}
