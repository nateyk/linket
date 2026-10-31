<?php

namespace App\Storefront\Models;

use App\Conversations\Models\Conversation;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StorefrontPaymentDispute extends Model
{
    public const REASONS = [
        'wrong_reference',
        'duplicate_payment',
        'missing_file',
    ];

    public const STATUS_OPEN = 'open';

    public const STATUS_INVESTIGATING = 'investigating';

    public const STATUS_RESOLVED = 'resolved';

    public const STATUS_CLOSED = 'closed';

    public const ACTIVE_STATUSES = [
        self::STATUS_OPEN,
        self::STATUS_INVESTIGATING,
    ];

    public const STATUSES = [
        self::STATUS_OPEN,
        self::STATUS_INVESTIGATING,
        self::STATUS_RESOLVED,
        self::STATUS_CLOSED,
    ];

    protected $guarded = ['id'];

    protected $casts = [
        'storefront_order_id' => 'integer',
        'conversation_id' => 'integer',
        'creator_id' => 'integer',
    ];

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(StorefrontOrder::class, 'storefront_order_id');
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(StorefrontPaymentDisputeEvent::class)->orderBy('id');
    }
}
