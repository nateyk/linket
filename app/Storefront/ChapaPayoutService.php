<?php

namespace App\Storefront;

use App\Storefront\Models\DigitalProductPayoutMethod;
use App\Storefront\Models\DigitalProductWithdrawalMethod;
use App\Storefront\Models\PayoutRequest;
use Chapa\Chapa\Chapa;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class ChapaPayoutService
{
    public function __construct(
        private \Chapa\Chapa\Chapa $chapa,
    ) {}

    public function createTransfer(PayoutRequest $payout): string
    {
        $method = $payout->withdrawalMethod;

        if (!$method) {
            throw new RuntimeException('No withdrawal method associated with payout.');
        }

        if (!$method->is_active) {
            throw new RuntimeException('Withdrawal method is not active.');
        }

        $destination = $payout->payout_destination;

        return match ($method->code) {
            'bank_transfer' => $this->createBankTransfer($payout, $destination),
            'telebirr' => $this->createTelebirrTransfer($payout, $destination),
            default => $this->createManualTransfer($payout, $method->code),
        };
    }

    public function verifyTransfer(string $reference): array
    {
        Log::info('Verifying Chapa transfer', ['reference' => $reference]);

        $response = $this->chapa->verifyTransfer($reference);

        Log::info('Chapa transfer verification response', [
            'reference' => $reference,
            'status' => data_get($response, 'data.status') ?? data_get($response, 'status'),
        ]);

        if (!isset($response['data']['status'])) {
            throw new RuntimeException('Chapa transfer verification failed.');
        }

        return $response['data'];
    }

    public function getBanks(): array
    {
        return Cache::remember('chapa:banks', 3600, function () {
            Log::info('Fetching Chapa banks list');
            $response = $this->chapa->getBanks();

            if (!isset($response['data']) || !is_array($response['data'])) {
                throw new RuntimeException('Chapa banks fetch failed.');
            }

            return $response['data'];
        });
    }

    public function validateBankCode(string $bankCode): bool
    {
        $banks = $this->getBanks();
        $code = strtoupper($bankCode);

        return collect($banks)->contains(function ($bank) use ($code) {
            return strtoupper($bank['slug']) === $code
                || strtoupper($bank['swift']) === $code
                || (isset($bank['id']) && (string)$bank['id'] === $code);
        });
    }

    public function findBankByCode(string $bankCode): ?array
    {
        $banks = $this->getBanks();
        $code = strtoupper($bankCode);

        return collect($banks)->first(function ($bank) use ($code) {
            return strtoupper($bank['slug']) === $code
                || strtoupper($bank['swift']) === $code
                || (isset($bank['id']) && (string)$bank['id'] === $code);
        });
    }

    private function createBankTransfer(PayoutRequest $payout, string $destination): string
    {
        $bankCode = $this->extractBankCode($destination);
        if (!$bankCode) {
            throw new RuntimeException('Bank code not found in destination. Please include bank code in account details (format: BANKCODE:ACCOUNTNUMBER).');
        }

        if (!$this->validateBankCode($bankCode)) {
            throw new RuntimeException("Invalid bank code: {$bankCode}. Please use a valid bank code from Chapa's bank list.");
        }

        $transferReference = 'CHAPA-TX-' . strtoupper(substr(md5($payout->id . time()), 0, 12));

        $data = [
            'account_name' => $payout->payoutMethod?->account_holder ?? 'Unknown',
            'account_number' => $this->extractAccountNumber($destination),
            'bank_code' => $bankCode,
            'amount' => number_format($payout->amount_cents / 100, 2, '.', ''),
            'currency' => $payout->currency,
            'reference' => $transferReference,
            'narration' => "Payout #{$payout->id} for {$payout->creator?->name}",
        ];

        Log::info('Initiating Chapa bank transfer', [
            'payout_id' => $payout->id,
            'reference' => $transferReference,
            'amount' => $data['amount'],
            'currency' => $data['currency'],
            'bank_code' => $bankCode,
        ]);

        $response = $this->chapa->createTransfer($data);

        Log::info('Chapa bank transfer response', [
            'payout_id' => $payout->id,
            'reference' => $transferReference,
            'status' => data_get($response, 'data.status') ?? data_get($response, 'status'),
        ]);

        if (!isset($response['data']['id']) && !isset($response['data']['transfer_id'])) {
            throw new RuntimeException('Chapa transfer failed.');
        }

        return $transferReference;
    }

    private function createTelebirrTransfer(PayoutRequest $payout, string $destination): string
    {
        // Telebirr transfers via Chapa use phone number as account_number
        $transferReference = 'CHAPA-TX-' . strtoupper(substr(md5($payout->id . time()), 0, 12));

        $data = [
            'account_name' => $payout->payoutMethod?->account_holder ?? 'Unknown',
            'account_number' => $this->extractPhoneNumber($destination),
            'bank_code' => 'TELEBIRR',
            'amount' => number_format($payout->amount_cents / 100, 2, '.', ''),
            'currency' => $payout->currency,
            'reference' => $transferReference,
            'narration' => "Telebirr payout #{$payout->id} for {$payout->creator?->name}",
        ];

        Log::info('Initiating Chapa Telebirr transfer', [
            'payout_id' => $payout->id,
            'reference' => $transferReference,
            'amount' => $data['amount'],
            'currency' => $data['currency'],
            'bank_code' => $data['bank_code'],
        ]);

        $response = $this->chapa->createTransfer($data);

        Log::info('Chapa Telebirr transfer response', [
            'payout_id' => $payout->id,
            'reference' => $transferReference,
            'status' => data_get($response, 'data.status') ?? data_get($response, 'status'),
        ]);

        if (!isset($response['data']['id']) && !isset($response['data']['transfer_id'])) {
            throw new RuntimeException('Chapa Telebirr transfer failed.');
        }

        return $transferReference;
    }

    private function createManualTransfer(PayoutRequest $payout, string $method): string
    {
        $transferReference = 'MANUAL-' . strtoupper(substr(md5($payout->id . time()), 0, 12));
        Log::info('Manual payout reference generated', [
            'payout_id' => $payout->id,
            'reference' => $transferReference,
            'method' => $method,
        ]);

        return $transferReference;
    }

    private function extractBankCode(string $destination): ?string
    {
        // Expect format: "BANKCODE:ACCOUNTNUMBER" or just account number with bank code stored separately
        if (str_contains($destination, ':')) {
            [$bankCode] = explode(':', $destination, 2);
            return strtoupper(trim($bankCode));
        }

        return null;
    }

    private function extractAccountNumber(string $destination): string
    {
        if (str_contains($destination, ':')) {
            [$bankCode, $accountNumber] = explode(':', $destination, 2);
            return trim($accountNumber);
        }

        return $destination;
    }

    private function extractPhoneNumber(string $destination): string
    {
        return preg_replace('/\D/', '', $destination);
    }
}
