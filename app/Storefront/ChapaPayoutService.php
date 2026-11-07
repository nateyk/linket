<?php

namespace App\Storefront;

use App\Payments\Chapa\ChapaV2Client;
use App\Payments\ChapaGateway;
use App\Storefront\Models\PayoutRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;

class ChapaPayoutService
{

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

        $data = app(ChapaV2Client::class)->verifyPayout(
            app(ChapaGateway::class)->platformSecret(),
            $reference,
        );

        Log::info('Chapa transfer verification response', [
            'reference' => $reference,
            'status' => $data['status'] ?? null,
        ]);

        if (!isset($data['status'])) {
            throw new RuntimeException('Chapa transfer verification failed.');
        }

        return $data;
    }

    public function getBanks(): array
    {
        return Cache::remember('chapa:banks', 3600, function () {
            Log::info('Fetching Chapa banks list');

            return app(ChapaV2Client::class)->payoutBanks(app(ChapaGateway::class)->platformSecret());
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

        $transferReference = $this->transferReference($payout);
        $bank = $this->findBankByCode($bankCode);

        Log::info('Initiating Chapa bank transfer', [
            'payout_id' => $payout->id,
            'reference' => $transferReference,
            'amount' => number_format($payout->amount_cents / 100, 2, '.', ''),
            'currency' => $payout->currency,
            'bank_code' => $bankCode,
        ]);

        $result = $this->sendPayout($payout, $transferReference, [
            'account_name' => $payout->payoutMethod?->account_holder ?? 'Unknown',
            'account_number' => $this->extractAccountNumber($destination),
            'bank_slug' => (string) ($bank['slug'] ?? $bankCode),
        ], "Payout #{$payout->id}");

        Log::info('Chapa bank transfer response', [
            'payout_id' => $payout->id,
            'reference' => $transferReference,
            'status' => $result['status'] ?? null,
        ]);

        return $transferReference;
    }

    private function createTelebirrTransfer(PayoutRequest $payout, string $destination): string
    {
        $transferReference = $this->transferReference($payout);

        Log::info('Initiating Chapa Telebirr transfer', [
            'payout_id' => $payout->id,
            'reference' => $transferReference,
            'amount' => number_format($payout->amount_cents / 100, 2, '.', ''),
            'currency' => $payout->currency,
            'bank_code' => 'TELEBIRR',
        ]);

        $result = $this->sendPayout($payout, $transferReference, [
            'account_name' => $payout->payoutMethod?->account_holder ?? 'Unknown',
            'account_number' => $this->extractPhoneNumber($destination),
            'bank_slug' => 'telebirr',
        ], "Telebirr payout #{$payout->id}");

        Log::info('Chapa Telebirr transfer response', [
            'payout_id' => $payout->id,
            'reference' => $transferReference,
            'status' => $result['status'] ?? null,
        ]);

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

    /** @param array{account_name: string, account_number: string, bank_slug: string} $account
     * @return array<string, mixed>
     */
    private function sendPayout(PayoutRequest $payout, string $reference, array $account, string $reason): array
    {
        return app(ChapaV2Client::class)->createPayout(app(ChapaGateway::class)->platformSecret(), [
            'amount_cents' => (int) $payout->amount_cents,
            'currency' => (string) $payout->currency,
            'merchant_reference' => $reference,
            'idempotency_key' => (string) Str::uuid(),
            'account' => $account,
            'reason' => $reason,
        ]);
    }

    private function transferReference(PayoutRequest $payout): string
    {
        return 'CHAPA-TX-'.strtoupper(substr(md5($payout->id.time()), 0, 11));
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
