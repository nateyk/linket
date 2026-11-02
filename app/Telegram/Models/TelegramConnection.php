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
        'notifications_enabled' => 'boolean',
        'notification_preferences' => 'array',
        'last_delivery_at' => 'datetime',
        'last_failed_at' => 'datetime',
        'consecutive_failures' => 'integer',
    ];

    /** @return array<string, bool> */
    public function notificationPreferences(): array
    {
        return \App\Telegram\Support\TelegramNotificationPreferences::normalize(
            $this->notification_preferences,
        );
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
