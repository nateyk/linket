<?php

namespace App\Courses\Models;

use App\Models\User;
use App\Storefront\Models\StorefrontOrder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Enrollment extends Model
{
    protected $table = 'course_enrollments';

    protected $fillable = ['course_id', 'user_id', 'storefront_order_id', 'status', 'enrolled_at', 'completed_at'];

    protected $casts = [
        'course_id' => 'integer',
        'user_id' => 'integer',
        'storefront_order_id' => 'integer',
        'enrolled_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(StorefrontOrder::class, 'storefront_order_id');
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function isRevoked(): bool
    {
        return $this->status === 'revoked';
    }
}
