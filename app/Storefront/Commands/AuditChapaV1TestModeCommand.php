<?php

declare(strict_types=1);

namespace App\Storefront\Commands;

use App\Payments\Chapa\ChapaV1TransferClient;
use App\Payments\Chapa\ChapaV2Client;
use App\Payments\Chapa\LinketChapaManager;
use App\Storefront\Support\EtbMajorAmount;
use App\Storefront\ChapaPayoutService;
use Illuminate\Console\Command;
use RuntimeException;
use Throwable;

/**
 * Read-only diagnostics for genuine Chapa v1 TEST keys.
 * This command never sends a transfer, settles a payout, or writes to the ledger.
 */
final class AuditChapaV1TestModeCommand extends Command
{
    protected $signature = 'chapa:v1:audit-test
                            {--reference= : An existing test transfer reference to inspect}
                            {--transfer-amount-cents= : Expected ETB cents for strict TEST transfer settlement check}
                            {--payment-reference= : An existing Chapa TEST checkout reference to verify}
                            {--payment-amount-cents= : Expected ETB cents for that existing test payment}';

    protected $description = 'Inspect test-only Chapa v1 payout bank catalog, ETB balance, and optional transfer verification without mutations.';

    public function handle(LinketChapaManager $manager, ChapaV1TransferClient $client, ChapaV2Client $payments): int
    {
        $secret = $manager->platformSecret();
        if (!str_starts_with($secret, 'CHASECK_TEST-')) {
            $this->error('Requires a Chapa TEST secret key. No provider request was sent.');
            return self::FAILURE;
        }

        $reference = (string) ($this->option('reference') ?? '');
        if ($reference !== '' && preg_match('/^[A-Za-z0-9_-]{4,120}$/', $reference) !== 1) {
            $this->error('Invalid test transfer reference. No provider request was sent.');
            return self::FAILURE;
        }
        $transferAmount = (string) ($this->option('transfer-amount-cents') ?? '');
        if ($transferAmount !== '' && ($reference === ''
            || preg_match('/^[1-9][0-9]{0,11}$/', $transferAmount) !== 1)) {
            $this->error('Transfer settlement amount requires a valid existing test transfer reference.');
            return self::FAILURE;
        }
        $paymentRef = (string) ($this->option('payment-reference') ?? '');
        $amountOption = (string) ($this->option('payment-amount-cents') ?? '');
        if (($paymentRef === '') !== ($amountOption === '')
            || ($paymentRef !== '' && preg_match('/^[A-Za-z0-9_-]{4,120}$/', $paymentRef) !== 1)
            || ($amountOption !== '' && preg_match('/^[1-9][0-9]{0,11}$/', $amountOption) !== 1)) {
            $this->error('Provide a valid test payment reference and its positive ETB amount in cents together.');
            return self::FAILURE;
        }

        try {
            $banks = $client->banks($secret);
            $this->showWallets($banks);
            $this->showSupportedBanks($banks);
            $this->showBalance($client->balance($secret));
            if ($reference !== '') {
                $this->showVerification(
                    $client->verify($secret, $reference), $reference,
                    $transferAmount === '' ? null : (int) $transferAmount,
                );
            }
            if ($paymentRef !== '') {
                $this->showPaymentVerification(
                    $payments->verifyPayment($secret, $paymentRef), $paymentRef, (int) $amountOption,
                );
            }
        } catch (Throwable $error) {
            // Never print raw provider responses, beneficiary numbers or API credentials.
            $this->error('Chapa test audit did not complete. Check test credentials, API access, and sanitized provider logs.');
            return self::FAILURE;
        }

        $this->info('Read-only Chapa v1 TEST audit complete. No transfer was submitted.');
        return self::SUCCESS;
    }

    /** @param array<int, array<string, mixed>> $banks */
    private function showWallets(array $banks): void
    {
        $rows = [];
        foreach (['telebirr', 'mpesa', 'yaya', 'cbebirr'] as $slug) {
            $bank = collect($banks)->first(fn ($item) => ($item['slug'] ?? '') === $slug);
            $active = is_array($bank) && !empty($bank['active'])
                && !empty($bank['is_active']) && ($bank['currency'] ?? '') === 'ETB';
            $rows[] = [$slug, $active ? 'active' : 'unavailable', $active ? (string) $bank['id'] : '-'];
        }

        $this->table(['Wallet', 'Chapa test catalog', 'Bank ID'], $rows);
    }

    /** @param array<int, array<string, mixed>> $banks */
    private function showSupportedBanks(array $banks): void
    {
        $found = [];
        foreach ($banks as $bank) {
            if (!is_array($bank) || empty($bank['active']) || empty($bank['is_active'])
                || strtoupper((string) ($bank['currency'] ?? '')) !== 'ETB'
                || !filter_var($bank['id'] ?? null, FILTER_VALIDATE_INT)) {
                continue;
            }

            $code = ChapaPayoutService::canonicalBankCode((string) ($bank['slug'] ?? ''))
                ?? ChapaPayoutService::canonicalBankCode((string) ($bank['name'] ?? ''));
            if ($code !== null && (ChapaPayoutService::PAYOUT_BANK_OPTIONS[$code]['method'] ?? '') === 'bank_transfer') {
                $found[$code] = [
                    ChapaPayoutService::PAYOUT_BANK_OPTIONS[$code]['name'],
                    (string) $bank['id'],
                ];
            }
        }

        $rows = [];
        foreach (ChapaPayoutService::PAYOUT_BANK_OPTIONS as $code => $option) {
            if ($option['method'] === 'bank_transfer' && isset($found[$code])) {
                $rows[] = [$option['name'], $code, $found[$code][1]];
            }
        }

        $this->table(['Active Chapa TEST bank', 'Code', 'Bank ID'], $rows);
    }

    /** @param array<string, mixed> $response */
    private function showBalance(array $response): void
    {
        $balance = $this->requireEtbBalance($response);
        $available = $balance['available_balance'] ?? null;
        $ledger = $balance['ledger_balance'] ?? null;
        if (!is_numeric($available) || !is_numeric($ledger)) {
            throw new RuntimeException('Incomplete ETB balance schema.');
        }

        $this->line('ETB available (test): '.number_format((float) $available, 2, '.', ''));
        $this->line('ETB ledger (test): '.number_format((float) $ledger, 2, '.', ''));
    }

    /** @param array<string, mixed> $response
     * @return array<string, mixed>
     */
    private function requireEtbBalance(array $response): array
    {
        $balances = $response['data'] ?? null;
        if (!is_array($balances)) {
            throw new RuntimeException('Unexpected Chapa balance schema.');
        }

        $etb = collect($balances)->first(fn ($item) =>
            is_array($item) && strtoupper((string) ($item['currency'] ?? '')) === 'ETB'
        );
        if (!is_array($etb)) {
            throw new RuntimeException('No ETB balance in Chapa test response.');
        }

        return $etb;
    }

    /** @param array<string, mixed> $payment */
    private function showPaymentVerification(array $payment, string $expectedReference, int $expectedCents): void
    {
        $reference = (string) ($payment['merchant_reference'] ?? $payment['tx_ref'] ?? '');
        $status = strtolower(trim((string) ($payment['status'] ?? '')));
        $currency = strtoupper(trim((string) ($payment['currency'] ?? '')));
        $amount = $payment['amount'] ?? null;
        if (!is_string($amount) || preg_match('/^[0-9]{1,10}(\.[0-9]{1,2})?$/', $amount) !== 1) {
            throw new RuntimeException('Invalid Chapa test payment amount.');
        }
        $amountCents = ChapaV2Client::centsFromMajor($amount);
        if (!hash_equals($expectedReference, $reference)
            || $currency !== 'ETB'
            || $amountCents !== $expectedCents
            || !in_array($status, ['success', 'pending', 'failed'], true)) {
            throw new RuntimeException('Chapa test payment verification does not match the expected transaction.');
        }

        $this->table(['Payment verification', 'Test result'], [
            ['provider status', $status],
            ['reference matches', 'yes'],
            ['ETB amount matches', 'yes'],
            ['currency', 'ETB'],
        ]);
        $this->line('Read-only payment verification; no order is fulfilled and no ledger entry is written.');
        if ($status !== 'success') {
            throw new RuntimeException('The test checkout has not settled successfully.');
        }
    }

    /** @param array<string, mixed> $response */
    private function showVerification(array $response, string $expectedReference, ?int $expectedCents): void
    {
        $payload = $response['data'] ?? null;
        if (!is_array($payload)) {
            throw new RuntimeException('Unexpected Chapa transfer verification schema.');
        }

        $reference = (string) ($payload['reference'] ?? $payload['tx_ref'] ?? $payload['merchant_reference'] ?? '');
        $this->table(['Verification field', 'Test value'], [
            ['provider status', (string) ($payload['status'] ?? 'unspecified')],
            ['reference matches', hash_equals($expectedReference, $reference) ? 'yes' : 'no'],
            ['currency', (string) ($payload['currency'] ?? 'unspecified')],
            ['amount', is_numeric($payload['amount'] ?? null) ? (string) $payload['amount'] : 'unspecified'],
        ]);
        $this->line('Response data fields: '.implode(', ', array_keys($payload)));

        if (!hash_equals($expectedReference, $reference)) {
            throw new RuntimeException('Chapa verification reference mismatch.');
        }
        if ($expectedCents !== null) {
            $amount = EtbMajorAmount::cents($payload['amount'] ?? null);
            $currency = strtoupper((string) ($payload['currency'] ?? ''));
            $status = strtolower((string) ($payload['status'] ?? ''));
            if ($amount !== $expectedCents || $currency !== 'ETB' || $status !== 'success') {
                throw new RuntimeException('Chapa test transfer has not passed settlement verification.');
            }
            $this->line('TEST transfer settlement verified by reference, ETB amount and success status.');
        }
    }
}
