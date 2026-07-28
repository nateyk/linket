<?php

namespace Common\Auth\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class SocialProfile extends Model
{
    protected $guarded = [];

    protected $casts = [
        'access_expires_at' => 'datetime',
    ];

    const MODEL_TYPE = 'social_profile';

    public static function getModelTypeAttribute(): string
    {
        return self::MODEL_TYPE;
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
