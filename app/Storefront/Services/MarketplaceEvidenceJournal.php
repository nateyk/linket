<?php

declare(strict_types=1);

namespace App\Storefront\Services;

use App\Storefront\Ledger\AccountCodes;
use App\Storefront\Models\DigitalProductPaymentRefund;
use App\Storefront\Models\PayoutRequest;
use App\Storefront\Models\StorefrontJournalEntry;
use App\Storefront\Models\StorefrontJournalLine;
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

        return $this->check($this->orderContext($order), $expected);
    }

    public function refund(DigitalProductPaymentRefund $refund): ?string
    {
        $order = $refund->order;
        if (!$order) {
            return 'refund_order_missing';
        }
        $context = $this->orderContext($order);
        $context['source_type'] = 'refund';
        $context['source_id'] = (int) $refund->id;
        $context['event_type'] = 'refund_executed';
        $context['currency'] = (string) $refund->currency;

        $entry = $this->entry($context);
        if (!$entry) {
            return 'journal_missing';
        }
        if (!$this->sameContext($entry, $context)) {
            return 'journal_context_mismatch';
        }

        return $this->refundAmountsMatch($this->totals($entry), $refund)
            ? null : 'journal_amount_mismatch';
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
        $context = [
            'source_type' => 'payout',
            'source_id' => (int) $payout->id,
            'event_type' => $event,
            'creator_id' => (int) $payout->creator_id,
            'workspace_id' => $payout->workspace_id,
            'currency' => (string) $payout->currency,
        ];

        return $this->check($context, [
            $accounts[0] => [(int) $payout->amount_cents, 0],
            $accounts[1] => [0, (int) $payout->amount_cents],
        ]);
    }

    private function orderContext(StorefrontOrder $order): array
    {
        return [
            'source_type' => 'order',
            'source_id' => (int) $order->id,
            'event_type' => 'sale_settled',
            'creator_id' => (int) $order->creator_id,
            'workspace_id' => $order->product?->workspace_id,
            'currency' => (string) $order->currency,
        ];
    }

    private function check(array $context, array $expected): ?string
    {
        $entry = $this->entry($context);
        if (!$entry) {
            return 'journal_missing';
        }
        if (!$this->sameContext($entry, $context)) {
            return 'journal_context_mismatch';
        }
        $actual = $this->totals($entry);
        ksort($actual);
        ksort($expected);

        return $actual === $expected ? null : 'journal_amount_mismatch';
    }

    private function refundAmountsMatch(array $totals, DigitalProductPaymentRefund $refund): bool
    {
        if (($totals[AccountCodes::PLATFORM_CHAPA_CLEARING] ?? [0, 0]) !== [0, (int) $refund->amount_cents]) {
            return false;
        }
        if (($totals[AccountCodes::PLATFORM_COMMISSION] ?? [0, 0]) !== [(int) $refund->platform_fee_reversal_cents, 0]) {
            return false;
        }
        unset($totals[AccountCodes::PLATFORM_CHAPA_CLEARING], $totals[AccountCodes::PLATFORM_COMMISSION]);

        $reversed = 0;
        foreach ([AccountCodes::CREATOR_HELD, AccountCodes::CREATOR_AVAILABLE, AccountCodes::CREATOR_DEFICIT_RECEIVABLE] as $account) {
            [$debit, $credit] = $totals[$account] ?? [0, 0];
            if ($credit !== 0) {
                return false;
            }
            $reversed += $debit;
            unset($totals[$account]);
        }

        return $totals === [] && $reversed === (int) $refund->creator_earnings_reversal_cents;
    }

    private function sameContext(StorefrontJournalEntry $entry, array $context): bool
    {
        if ((int) $entry->creator_id !== $context['creator_id']) {
            return false;
        }
        if ($entry->workspace_id !== $context['workspace_id']) {
            return false;
        }
        if (strtoupper((string) $entry->currency) !== strtoupper($context['currency'])) {
            return false;
        }
        foreach ($entry->lines as $line) {
            if (!$this->sameLineContext($line, $context)) {
                return false;
            }
        }
        return true;
    }

    private function sameLineContext(StorefrontJournalLine $line, array $context): bool
    {
        if ((int) $line->creator_id !== $context['creator_id']) {
            return false;
        }
        if ($line->workspace_id !== $context['workspace_id']) {
            return false;
        }
        return strtoupper((string) $line->currency) === strtoupper($context['currency']);
    }

    private function entry(array $context): ?StorefrontJournalEntry
    {
        return StorefrontJournalEntry::query()->with('lines')
            ->where('source_type', $context['source_type'])
            ->where('source_id', $context['source_id'])
            ->where('event_type', $context['event_type'])->first();
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
