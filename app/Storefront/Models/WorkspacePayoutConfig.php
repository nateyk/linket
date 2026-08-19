<?php

namespace App\Storefront\Models;

use App\Models\User;
use Common\Workspaces\Traits\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkspacePayoutConfig extends StorefrontModel
{
    use BelongsToWorkspace;

    protected $fillable = [
        'workspace_id',
        'withdrawal_method_id',
        'withdrawal_account',
    ];

    protected $casts = [
        'workspace_id' => 'integer',
        'withdrawal_method_id' => 'integer',
    ];

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(\Common\Workspaces\Models\Workspace::class, 'workspace_id');
    }

    public function withdrawalMethod(): BelongsTo
    {
        return $this->belongsTo(DigitalProductWithdrawalMethod::class, 'withdrawal_method_id');
    }
}