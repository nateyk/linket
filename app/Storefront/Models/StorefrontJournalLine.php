<?php

namespace App\Storefront\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StorefrontJournalLine extends StorefrontModel
{
    protected $guarded = [];

    protected $casts = [
        'journal_entry_id' => 'integer',
        'creator_id' => 'integer',
        'workspace_id' => 'integer',
        'debit_cents' => 'integer',
        'credit_cents' => 'integer',
    ];

    public function entry(): BelongsTo
    {
        return $this->belongsTo(StorefrontJournalEntry::class, 'journal_entry_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }
}
