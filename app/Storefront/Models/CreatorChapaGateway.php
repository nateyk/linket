<?php

namespace App\Storefront\Models;

use App\Models\User;
use Common\Workspaces\Models\Workspace;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CreatorChapaGateway extends StorefrontModel
{
    protected $fillable = [
        'workspace_id',
        'user_id',
        'public_key',
        'secret_key',
    ];

    protected $hidden = ['secret_key'];

    protected function casts(): array
    {
        return [
            'secret_key' => 'encrypted',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function maskedPublicKey(): string
    {
        $visible = substr($this->public_key, -4);

        return str_repeat('•', max(0, strlen($this->public_key) - 4)).$visible;
    }
}
