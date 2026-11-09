<?php

namespace App\Payments\VerifyEt;

use App\Payments\Models\DirectPaymentVerification;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\RateLimiter;
use RuntimeException;

final class VerifyEtClient
{
    /** @param array<string, mixed> $payload
     *  @return array<string, mixed>
     */
    public function submitVerification(array $payload, string $idempotencyKey): array
    {
        if (RateLimiter::tooManyAttempts('verify-et:write', 60)) {
            throw new VerifyEtException(429, 'client_rate_limit');
        }
        RateLimiter::hit('verify-et:write', 60);

        return $this->request('post', '/api/verify?waitMs=5000', $payload, $idempotencyKey);
    }

    /** @return array<string, mixed> */
    public function getVerification(string $requestId): array
    {
        return $this->request('get', '/api/verify/' . rawurlencode($requestId));
    }

    /** @param array<string, mixed> $payload
     *  @return array<string, mixed>
     */
    private function request(string $method, string $path, array $payload = [], ?string $idempotencyKey = null): array
    {
        if (config('services.verify_et.mock')) {
            // A missed preflight must never turn production financial evidence into mock evidence.
            if (app()->isProduction() || config('app.env') === 'production') {
                throw new RuntimeException('Verify.et mock responses are forbidden in production.');
            }
            return $this->mockedResponse($method, $path, $payload, $idempotencyKey);
        }

        $apiKey = VerifyEtSettings::get('api_key');
        if (!is_string($apiKey) || $apiKey === '') {
            throw new RuntimeException('Verify.et is not configured.');
        }

        $request = app(VerifyEtHttp::class)->factory()->baseUrl((string) config('services.verify_et.base_url', 'https://verify.et'))
            ->withHeaders(['x-api-key' => $apiKey])
            ->acceptJson()
            ->asJson()
            ->connectTimeout(10)
            ->timeout(30)
            ->retry(4, function (int $attempt, mixed $exception): int {
                $retryAfter = method_exists($exception, 'response')
                    ? $exception->response()?->header('Retry-After')
                    : null;
                if (is_numeric($retryAfter)) {
                    return min(30000, (int) $retryAfter * 1000);
                }

                return min(4000, 250 * (2 ** ($attempt - 1)) + random_int(0, 150));
            }, fn (mixed $exception): bool => $exception instanceof ConnectionException
                || (method_exists($exception, 'response') && ($exception->response()?->serverError() || $exception->response()?->status() === 429)));

        if ($idempotencyKey !== null) {
            $request = $request->withHeaders(['Idempotency-Key' => $idempotencyKey]);
        }

        try {
            $response = $method === 'post'
                ? $request->post($path, $payload)
                : $request->get($path);
        } catch (ConnectionException $exception) {
            throw new VerifyEtException(0, 'connection_error');
        }

        if (!in_array($response->status(), [200, 202], true)) {
            $error = $response->json('error');
            $providerCode = is_array($error) && is_string($error['code'] ?? null) && preg_match('/^[A-Za-z0-9_-]{1,80}$/D', $error['code']) ? $error['code'] : null;
            throw new VerifyEtException(
                $response->status(),
                'provider_error',
                $providerCode,
                $response->header('Retry-After') ? (int) $response->header('Retry-After') : null,
            );
        }

        try {
            $body = app(VerifyEtJson::class)->decode($response->body());
        } catch (\JsonException) {
            throw new VerifyEtException(0, 'invalid_response');
        }

        return [...$body, '_http_status' => $response->status()];
    }

    /**
     * Synthetic Verify.et responses for isolated E2E / local testing only.
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function mockedResponse(string $method, string $path, array $payload, ?string $idempotencyKey): array
    {
        $reference = (string) (
            $payload['receiptNumber']
            ?? $payload['referenceNumber']
            ?? $payload['transactionNumber']
            ?? $payload['reference']
            ?? 'MOCK-REF'
        );
        $verification = DirectPaymentVerification::query()->where('reference', $reference)->latest('id')->first();
        $amountMajor = $verification
            ? number_format($verification->amount_cents / 100, 2, '.', '')
            : (string) ($payload['amount'] ?? '0');
        $currency = (string) ($payload['currency'] ?? $verification?->currency ?? 'ETB');
        $bank = (string) ($payload['bank'] ?? $verification?->bank_code ?? 'cbe');
        $settlement = (string) ($payload['settlementAccount'] ?? $verification?->settlement_account ?? '');
        $requestId = 'mock_'.md5($method.$path.$reference.($idempotencyKey ?? ''));

        if (str_starts_with($reference, 'REJECT')) {
            // Settlement evidence is present so the gateway reaches
            // validCompletedTransaction; verified/status fail → mismatch → Rejected.
            return [
                'requestId' => $requestId,
                'verification' => ['processingStatus' => 'completed', 'status' => 'failed', 'verified' => false],
                'data' => [[
                    'bank' => $bank,
                    'status' => 'failed',
                    'verified' => false,
                    'amount' => $amountMajor,
                    'currency' => $currency,
                    'receiptNumber' => $reference,
                    'referenceNumber' => $reference,
                    'settlementAccountMatch' => [
                        'matched' => true,
                        'ambiguous' => false,
                        'matchConfidence' => 'high',
                        'candidateCount' => 1,
                        'matchedSettlementAccount' => $settlement !== '' ? $settlement : '1000123456789',
                    ],
                ]],
                '_http_status' => 200,
            ];
        }

        return [
            'requestId' => $requestId,
            'verification' => ['processingStatus' => 'completed', 'status' => 'success', 'verified' => true],
            'data' => [[
                'bank' => $bank,
                'status' => 'success',
                'verified' => true,
                'amount' => $amountMajor,
                'currency' => $currency,
                'receiptNumber' => $reference,
                'referenceNumber' => $reference,
                'settlementAccountMatch' => [
                    'matched' => true,
                    'ambiguous' => false,
                    'matchConfidence' => 'high',
                    'candidateCount' => 1,
                    'matchedSettlementAccount' => $settlement !== '' ? $settlement : '1000123456789',
                ],
            ]],
            '_http_status' => 200,
        ];
    }
}
