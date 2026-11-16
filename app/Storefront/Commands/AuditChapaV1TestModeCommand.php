<?php

declare(strict_types=1);

namespace App\Storefront\Commands;

use App\Payments\Chapa\ChapaV1TransferClient;
use App\Payments\Chapa\LinketChapaManager;
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
                            {--reference= : An existing test transfer reference to inspect}';

    protected $description = 'Inspect test-only Chapa v1 payout bank catalog, ETB balance, and optional transfer verification without mutations.';

    public function handle(LinketChapaManager $manager, ChapaV1TransferClient $client): int
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

        try {
            $this->showWallets($client->banks($secret));
            $this->showBalance($client->balance($secret));
            if ($reference !== '') {
                $this->showVerification($client->verify($secret, $reference), $reference);
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

    /** @param array<string, mixed> $response */
    private function showBalance(array $response): void
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

        $available = $etb['available_balance'] ?? null;
        $ledger = $etb['ledger_balance'] ?? null;
        if (!is_numeric($available) || !is_numeric($ledger)) {
            throw new RuntimeException('Incomplete ETB balance schema.');
        }

        $this->line('ETB available (test): '.number_format((float) $available, 2, '.', ''));
        $this->line('ETB ledger (test): '.number_format((float) $ledger, 2, '.', ''));
    }

    /** @param array<string, mixed> $response */
    private function showVerification(array $response, string $expectedReference): void
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
    }
}
