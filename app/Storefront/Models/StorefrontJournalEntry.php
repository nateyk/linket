<?php

namespace App\Storefront\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StorefrontJournalEntry extends StorefrontModel
{
    protected $guarded = [];

    protected $casts = [
        'entry_number' => 'integer',
        'source_id' => 'integer',
        'creator_id' => 'integer',
        'workspace_id' => 'integer',
        'occurred_at' => 'datetime',
        'reversal_of_id' => 'integer',
        'metadata' => 'array',
    ];

    public function lines(): HasMany
    {
        return $this->hasMany(StorefrontJournalLine::class, 'journal_entry_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function reversalOf(): BelongsTo
    {
        return $this->belongsTo(self::class, 'reversal_of_id');
    }

    public function reversals(): HasMany
    {
        return $this->hasMany(self::class, 'reversal_of_id');
    }
}
