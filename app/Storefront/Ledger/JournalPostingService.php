<?php

namespace App\Storefront\Ledger;

use App\Storefront\Ledger\Exceptions\InvalidJournalLineException;
use App\Storefront\Ledger\Exceptions\UnbalancedJournalEntryException;
use App\Storefront\Models\StorefrontJournalEntry;
use App\Storefront\Models\StorefrontJournalLine;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class JournalPostingService
{
    /**
     * @param JournalEntryData $entryData
     * @param JournalLineData[] $lines
     * @throws UnbalancedJournalEntryException
     * @throws InvalidJournalLineException
     */
    public function validateBalanced(JournalEntryData $entryData, array $lines): void
    {
        if (empty($lines)) {
            throw new UnbalancedJournalEntryException("Journal entry must contain at least one line.");
        }

        $totalDebits = 0;
        $totalCredits = 0;

        foreach ($lines as $line) {
            $line->validate();

            if ($line->currency !== $entryData->currency) {
                throw new InvalidJournalLineException(
                    "Line currency '{$line->currency}' does not match entry currency '{$entryData->currency}'."
                );
            }

            $totalDebits += $line->debitCents;
            $totalCredits += $line->creditCents;
        }

        if ($totalDebits !== $totalCredits) {
            throw new UnbalancedJournalEntryException(
                "Journal entry is unbalanced: total debits ({$totalDebits}) do not equal total credits ({$totalCredits})."
            );
        }
    }

    /**
     * @param JournalEntryData $entryData
     * @param JournalLineData[] $lines
     * @return StorefrontJournalEntry
     */
    public function post(JournalEntryData $entryData, array $lines): StorefrontJournalEntry
    {
        $this->validateBalanced($entryData, $lines);

        return DB::transaction(function () use ($entryData, $lines): StorefrontJournalEntry {
            // Check for existing entry for strict idempotency
            $existing = StorefrontJournalEntry::query()
                ->where('source_type', $entryData->sourceType)
                ->where('source_id', $entryData->sourceId)
                ->where('event_type', $entryData->eventType)
                ->with('lines')
                ->first();

            if ($existing) {
                return $existing;
            }

            $maxEntryNumber = (int) StorefrontJournalEntry::query()->lockForUpdate()->max('entry_number');
            $entryNumber = $maxEntryNumber + 1;

            $entry = StorefrontJournalEntry::create([
                'uuid' => (string) Str::uuid(),
                'entry_number' => $entryNumber,
                'source_type' => $entryData->sourceType,
                'source_id' => $entryData->sourceId,
                'event_type' => $entryData->eventType,
                'creator_id' => $entryData->creatorId,
                'workspace_id' => $entryData->workspaceId,
                'currency' => $entryData->currency,
                'description' => $entryData->description,
                'occurred_at' => $entryData->occurredAt ?? now(),
                'reversal_of_id' => $entryData->reversalOfId,
                'metadata' => $entryData->metadata,
            ]);

            foreach ($lines as $line) {
                StorefrontJournalLine::create([
                    'journal_entry_id' => $entry->id,
                    'account_code' => $line->accountCode,
                    'creator_id' => $line->creatorId ?? $entryData->creatorId,
                    'workspace_id' => $line->workspaceId ?? $entryData->workspaceId,
                    'currency' => $line->currency,
                    'debit_cents' => $line->debitCents,
                    'credit_cents' => $line->creditCents,
                ]);
            }

            return $entry->load('lines');
        });
    }
}
