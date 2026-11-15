<?php

declare(strict_types=1);

namespace App\Storefront\Models;

use App\Models\User;
use Common\Workspaces\Traits\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class DigitalProductPayoutMethod extends StorefrontModel
{
    use BelongsToWorkspace;

    public const STATUS_ACTIVE = 'active';
    public const STATUS_PENDING = 'pending_verification';
    public const STATUS_DEACTIVATED = 'deactivated';

    protected $fillable = [
        'workspace_id',
        'creator_id',
        'withdrawal_method_id',
        'type',
        'bank_code',
        'bank_name',
        'account_holder',
        'destination',
        'account_number_last_four',
        'display_label',
        'is_active',
        'is_default',
        'status',
        'metadata',
    ];

    protected $hidden = ['destination'];

    protected $casts = [
        'workspace_id' => 'integer',
        'creator_id' => 'integer',
        'withdrawal_method_id' => 'integer',
        'destination' => 'encrypted',
        'is_active' => 'boolean',
        'is_default' => 'boolean',
        'metadata' => 'array',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function withdrawalMethod(): BelongsTo
    {
        return $this->belongsTo(DigitalProductWithdrawalMethod::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function maskedAccountNumber(): string
    {
        $suffix = $this->account_number_last_four;
        if (blank($suffix) && filled($this->destination)) {
            $suffix = Str::of((string) $this->destination)->replaceMatches('/\s+/', '')->substr(-4)->value();
        }

        return $suffix ? '•••• ' . $suffix : '••••';
    }
}
