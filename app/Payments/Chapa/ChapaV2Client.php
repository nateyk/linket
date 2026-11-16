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
    private const V1_BASE_URL = 'https://api.chapa.co/v1';

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

        $customer = $payment['customer'] ?? [];
        $body = array_filter([
            'amount' => self::majorFromCents($payment['amount_cents']),
            'currency' => $payment['currency'],
            'email' => $customer['email'] ?? null,
            'first_name' => $customer['first_name'] ?? null,
            'last_name' => $customer['last_name'] ?? null,
            'phone_number' => $customer['phone_number'] ?? null,
            'tx_ref' => $payment['merchant_reference'],
            'callback_url' => $payment['callback_url'] ?? null,
            'return_url' => $payment['return_url'] ?? null,
            'customization' => $payment['customization'] ?? null,
        ], fn (mixed $value): bool => $value !== null);

        $response = $this->send($secret)
            ->post(self::V1_BASE_URL.'/transaction/initialize', $body);

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
            ->get(self::V1_BASE_URL.'/transaction/verify/'.rawurlencode($reference));

        $payload = $this->jsonOrFail($response);
        $data = (array) ($payload['data'] ?? []);
        if (array_key_exists('amount', $data)) {
            $data['amount'] = $this->majorAmount($data['amount']);
        }
        if (!isset($data['merchant_reference']) && is_string($data['tx_ref'] ?? null)) {
            $data['merchant_reference'] = $data['tx_ref'];
        }
        if (!isset($data['chapa_reference']) && is_string($data['reference'] ?? null)) {
            $data['chapa_reference'] = $data['reference'];
        }
        $customer = (array) ($data['customer'] ?? []);
        if (!isset($data['email']) && is_string($customer['email'] ?? null)) {
            $data['email'] = $customer['email'];
        }

        return $data;
    }

    public function secretAuthenticates(string $secret): bool
    {
        return $this->secretStatus($secret) === 'accepted';
    }

    /** @return 'accepted'|'unauthorized'|'environment_mismatch' */
    public function secretStatus(string $secret): string
    {
        $response = $this->request($secret)->get(self::V1_BASE_URL.'/banks');

        if ($response->status() === 403 && $response->json('error.code') === 'INVALID_VALUE') {
            return 'environment_mismatch';
        }

        if (in_array($response->status(), [401, 403], true)) {
            return 'unauthorized';
        }

        $this->jsonOrFail($response);

        return 'accepted';
    }

    public static function centsFromMajor(string $amount): int
    {
        if (!preg_match('/^\d+(\.\d{1,2})?$/', $amount)) {
            throw new RuntimeException('Invalid Chapa amount.');
        }

        $parts = explode('.', $amount, 2);
        $whole = (int) $parts[0];
        $cents = isset($parts[1]) ? (int) str_pad($parts[1], 2, '0', STR_PAD_RIGHT) : 0;

        return ($whole * 100) + $cents;
    }

    public static function majorFromCents(int $cents): string
    {
        $sign = $cents < 0 ? '-' : '';
        $abs = abs($cents);
        $whole = intdiv($abs, 100);
        $rem = $abs % 100;

        return sprintf('%s%d.%02d', $sign, $whole, $rem);
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

    private function majorAmount(mixed $amount): string
    {
        if (is_string($amount) && str_contains($amount, '.')) {
            return self::majorFromCents(self::centsFromMajor($amount));
        }

        if (is_int($amount) || (is_string($amount) && ctype_digit($amount))) {
            return self::majorFromCents(((int) $amount) * 100);
        }

        if (is_float($amount)) {
            return self::majorFromCents(self::centsFromMajor(number_format($amount, 2, '.', '')));
        }

        return (string) $amount;
    }

    private function referenceFromCheckoutUrl(string $checkoutUrl): ?string
    {
        $reference = basename((string) parse_url($checkoutUrl, PHP_URL_PATH));

        return $reference !== '' ? $reference : null;
    }
}
