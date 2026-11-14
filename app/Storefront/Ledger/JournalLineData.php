<?php

namespace App\Storefront\Ledger;

use App\Storefront\Ledger\Exceptions\InvalidJournalLineException;

final class JournalLineData
{
    public function __construct(
        public readonly string $accountCode,
        public readonly int $debitCents,
        public readonly int $creditCents,
        public readonly string $currency,
        public readonly ?int $creatorId = null,
        public readonly ?int $workspaceId = null,
    ) {
    }

    public function validate(): void
    {
        if ($this->debitCents < 0 || $this->creditCents < 0) {
            throw new InvalidJournalLineException("Debit and credit amounts must be non-negative integer cents.");
        }

        if ($this->debitCents === 0 && $this->creditCents === 0) {
            throw new InvalidJournalLineException("Journal line must have a non-zero debit or credit amount.");
        }

        if ($this->debitCents > 0 && $this->creditCents > 0) {
            throw new InvalidJournalLineException("Journal line cannot have both debit and credit amounts simultaneously.");
        }

        if (blank($this->currency)) {
            throw new InvalidJournalLineException("Journal line must specify an explicit currency.");
        }
    }
}
