<?php

namespace App\Storefront\Models;

use App\Models\User;
use Common\Workspaces\Traits\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DigitalProductPayoutMethod extends StorefrontModel
{
    use BelongsToWorkspace;

    protected $fillable = [
        'workspace_id',
        'creator_id',
        'withdrawal_method_id',
        'type',
        'account_holder',
        'destination',
        'display_label',
    ];

    protected $hidden = ['destination'];

    protected $casts = [
        'workspace_id' => 'integer',
        'creator_id' => 'integer',
        'destination' => 'encrypted',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function withdrawalMethod(): BelongsTo
    {
        return $this->belongsTo(DigitalProductWithdrawalMethod::class);
    }
}
