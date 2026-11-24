<?php

declare(strict_types=1);

namespace App\Payments\Chapa;

use App\Payments\Chapa\Exceptions\ChapaTransferRejectedException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Chapa v1 transfers. A queued response is NOT proof of settlement.
 * No network call is retried automatically: a timeout may mean Chapa accepted the request.
 */
final class ChapaV1TransferClient
{
    private const BASE_URL = 'https://api.chapa.co/v1';

    private function request(string $secret): PendingRequest
    {
        if (blank($secret)) {
            throw new RuntimeException('Platform Chapa secret is not configured.');
        }

        return Http::withToken($secret)
            ->acceptJson()
            ->asJson()
            ->connectTimeout(5)
            ->timeout(20);
    }

    /** @return array<int, array<string, mixed>> */
    public function banks(string $secret): array
    {
        $response = $this->request($secret)->get(self::BASE_URL.'/banks');
        if (!$response->successful() || $response->json('status') === 'failed') {
            throw new RuntimeException('Unable to retrieve Chapa payout destinations.');
        }

        $banks = $response->json('data');
        if (!is_array($banks) || !array_is_list($banks)) {
            throw new RuntimeException('Chapa bank list was not valid.');
        }

        return $banks;
    }

    /** @return array<string, mixed> */
    public function create(string $secret, array $payload): array
    {
        $response = $this->request($secret)->post(self::BASE_URL.'/transfers', $payload);
        $data = $this->successfulPayload($response);
        if ($data === null) {
            $this->throwIfExplicitlyRejected($response);

            throw new RuntimeException('Chapa did not accept the transfer. Check the transfer reference before retrying.');
        }

        return $data;
    }

    /** @return array<string, mixed> */
    public function verify(string $secret, string $reference): array
    {
        $response = $this->request($secret)->get(self::BASE_URL.'/transfers/verify/'.rawurlencode($reference));
        $json = $response->json();
        if (!$response->successful() || !is_array($json)) {
            throw new RuntimeException('Unable to verify transfer settlement with Chapa.');
        }

        return $json;
    }

    /** @return array<string, mixed> */
    public function balance(string $secret): array
    {
        $response = $this->request($secret)->get(self::BASE_URL.'/balances');
        $data = $this->successfulPayload($response);
        if ($data === null) {
            throw new RuntimeException('Unable to retrieve Chapa available balance.');
        }

        return $data;
    }
    /** @return array<string, mixed>|null */
    private function successfulPayload(Response $response): ?array
    {
        if (!$response->successful()) {
            return null;
        }

        $data = $response->json();
        if (!is_array($data)) {
            return null;
        }

        if (strtolower((string) ($data['status'] ?? '')) !== 'success') {
            return null;
        }

        return $data;
    }

    private function throwIfExplicitlyRejected(Response $response): void
    {
        if ($response->serverError()) {
            return;
        }

        $data = $response->json();
        if (!is_array($data)
            || !in_array(strtolower((string) ($data['status'] ?? '')), ['failed', 'rejected'], true)) {
            return;
        }

        $message = is_string($data['message'] ?? null) ? trim($data['message']) : '';

        throw new ChapaTransferRejectedException(
            providerMessage: $message !== '' ? $message : 'Chapa rejected the transfer.',
            httpStatus: $response->status(),
        );
    }
}
