<?php

namespace App\Telegram\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class TelegramConnection extends Model
{
    protected $guarded = [];

    protected $casts = [
        'telegram_user_id' => 'integer',
        'telegram_chat_id' => 'integer',
        'connected_at' => 'datetime',
        'last_seen_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
