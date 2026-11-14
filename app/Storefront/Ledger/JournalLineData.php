<?php

namespace App\Storefront\Ledger;

use App\Storefront\Ledger\Exceptions\InvalidJournalLineException;

final class JournalLineData
{
    public readonly ?int $creatorId;
    public readonly ?int $workspaceId;

    public function __construct(
        public readonly string $accountCode,
        public readonly int $debitCents,
        public readonly int $creditCents,
        public readonly string $currency,
        array $context = [],
    ) {
        $this->creatorId = $context['creator_id'] ?? null;
        $this->workspaceId = $context['workspace_id'] ?? null;
    }

    public function validate(): void
    {
        $this->validateBounds();
        $this->validateDirection();

        if (blank($this->currency)) {
            throw new InvalidJournalLineException("Journal line must specify an explicit currency.");
        }
    }

    private function validateBounds(): void
    {
        if ($this->debitCents < 0 || $this->creditCents < 0) {
            throw new InvalidJournalLineException("Debit and credit amounts must be non-negative integer cents.");
        }

        if ($this->debitCents === 0 && $this->creditCents === 0) {
            throw new InvalidJournalLineException("Journal line must have a non-zero debit or credit amount.");
        }
    }

    private function validateDirection(): void
    {
        if ($this->debitCents > 0 && $this->creditCents > 0) {
            throw new InvalidJournalLineException("Journal line cannot have both debit and credit amounts simultaneously.");
        }
    }
}
