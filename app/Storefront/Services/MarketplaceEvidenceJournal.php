<?php

declare(strict_types=1);

namespace App\Storefront\Services;

use App\Storefront\Ledger\AccountCodes;
use App\Storefront\Models\DigitalProductPaymentRefund;
use App\Storefront\Models\PayoutRequest;
use App\Storefront\Models\StorefrontJournalEntry;
use App\Storefront\Models\StorefrontOrder;

final class MarketplaceEvidenceJournal
{
    public function hasOrderSale(int $orderId): bool
    {
        return StorefrontJournalEntry::query()
            ->where('source_type', 'order')->where('source_id', $orderId)
            ->where('event_type', 'sale_settled')->exists();
    }

    public function sale(StorefrontOrder $order): ?string
    {
        $expected = [
            AccountCodes::PLATFORM_CHAPA_CLEARING => [(int) $order->gross_amount_cents, 0],
            AccountCodes::CREATOR_HELD => [0, (int) $order->creator_earnings_cents],
        ];
        if ($order->platform_fee_cents > 0) {
            $expected[AccountCodes::PLATFORM_COMMISSION] = [0, (int) $order->platform_fee_cents];
        }

        return $this->check(
            'order', (int) $order->id, 'sale_settled', (int) $order->creator_id,
            $order->product?->workspace_id, (string) $order->currency, $expected,
        );
    }

    public function refund(DigitalProductPaymentRefund $refund): ?string
    {
        $entry = $this->entry('refund', (int) $refund->id, 'refund_executed');
        if ($entry === null) {
            return 'journal_missing';
        }

        $order = $refund->order;
        if (!$order) {
            return 'refund_order_missing';
        }
        $expected = [
            AccountCodes::PLATFORM_CHAPA_CLEARING => [0, (int) $refund->amount_cents],
            AccountCodes::PLATFORM_COMMISSION => [(int) $refund->platform_fee_reversal_cents, 0],
        ];
        $error = $this->contextError($entry, (int) $order->creator_id,
            $order->product?->workspace_id, (string) $refund->currency);
        if ($error !== null) {
            return $error;
        }

        $totals = $this->totals($entry);
        foreach ($expected as $account => $amounts) {
            if (($totals[$account] ?? [0, 0]) !== $amounts) {
                return 'journal_amount_mismatch';
            }
            unset($totals[$account]);
        }
        $reversed = 0;
        foreach ([AccountCodes::CREATOR_HELD, AccountCodes::CREATOR_AVAILABLE, AccountCodes::CREATOR_DEFICIT_RECEIVABLE] as $account) {
            [$debit, $credit] = $totals[$account] ?? [0, 0];
            if ($credit !== 0) {
                return 'journal_amount_mismatch';
            }
            $reversed += $debit;
            unset($totals[$account]);
        }

        return $totals !== [] || $reversed !== (int) $refund->creator_earnings_reversal_cents
            ? 'journal_amount_mismatch' : null;
    }

    public function payout(PayoutRequest $payout, string $event): ?string
    {
        $accounts = match ($event) {
            'withdrawal_reserved' => [AccountCodes::CREATOR_AVAILABLE, AccountCodes::CREATOR_RESERVED],
            'withdrawal_released' => [AccountCodes::CREATOR_RESERVED, AccountCodes::CREATOR_AVAILABLE],
            'withdrawal_disbursed' => [AccountCodes::CREATOR_RESERVED, AccountCodes::PLATFORM_BANK_DISBURSED],
            default => null,
        };
        if ($accounts === null) {
            return 'unsupported_journal_event';
        }

        return $this->check(
            'payout', (int) $payout->id, $event, (int) $payout->creator_id,
            $payout->workspace_id, (string) $payout->currency,
            [
                $accounts[0] => [(int) $payout->amount_cents, 0],
                $accounts[1] => [0, (int) $payout->amount_cents],
            ],
        );
    }

    private function check(string $source, int $id, string $event, int $creator,
        ?int $workspace, string $currency, array $expected): ?string
    {
        $entry = $this->entry($source, $id, $event);
        if ($entry === null) {
            return 'journal_missing';
        }
        $error = $this->contextError($entry, $creator, $workspace, $currency);
        if ($error !== null) {
            return $error;
        }

        $actual = $this->totals($entry);
        ksort($actual);
        ksort($expected);
        return $actual === $expected ? null : 'journal_amount_mismatch';
    }

    private function contextError(StorefrontJournalEntry $entry, int $creator,
        ?int $workspace, string $currency): ?string
    {
        if ((int) $entry->creator_id !== $creator
            || $entry->workspace_id !== $workspace
            || strtoupper((string) $entry->currency) !== strtoupper($currency)) {
            return 'journal_context_mismatch';
        }

        foreach ($entry->lines as $line) {
            if ((int) $line->creator_id !== $creator
                || $line->workspace_id !== $workspace
                || strtoupper((string) $line->currency) !== strtoupper($currency)) {
                return 'journal_context_mismatch';
            }
        }

        return null;
    }

    private function entry(string $source, int $id, string $event): ?StorefrontJournalEntry
    {
        return StorefrontJournalEntry::query()->with('lines')
            ->where('source_type', $source)->where('source_id', $id)
            ->where('event_type', $event)->first();
    }

    /** @return array<string, array{int, int}> */
    private function totals(StorefrontJournalEntry $entry): array
    {
        $totals = [];
        foreach ($entry->lines as $line) {
            $account = (string) $line->account_code;
            $totals[$account] ??= [0, 0];
            $totals[$account][0] += (int) $line->debit_cents;
            $totals[$account][1] += (int) $line->credit_cents;
        }
        return $totals;
    }
}
