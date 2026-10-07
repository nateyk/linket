<?php

namespace App\Storefront\Models;

use App\Models\User;
use App\Biolinks\Models\Biolink;
use App\Stores\Models\Store;
use Codebyray\ReviewRateable\Traits\ReviewRateable;
use Common\Files\FileEntry;
use Common\Workspaces\Traits\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class DigitalProduct extends StorefrontModel
{
    use BelongsToWorkspace, ReviewRateable, SoftDeletes;

    protected $fillable = [
        'workspace_id',
        'user_id',
        'cover_file_entry_id',
        'title',
        'description',
        'learning_outcomes',
        'price_cents',
        'currency',
        'status',
        'rejection_reason',
        'approved_at',
        'review_requested_at',
        'review_requested_by',
        'pending_review_snapshot',
        'type',
        'views_count',
    ];
    protected $casts = ['price_cents' => 'integer', 'cover_file_entry_id' => 'integer', 'approved_at' => 'datetime', 'review_requested_at' => 'datetime', 'review_requested_by' => 'integer', 'workspace_id' => 'integer', 'user_id' => 'integer', 'learning_outcomes' => 'array', 'pending_review_snapshot' => 'array'];

    public function course(): \Illuminate\Database\Eloquent\Relations\HasOne { return $this->hasOne(\App\Courses\Models\Course::class); }
    public function isCourse(): bool { return ($this->type ?? 'digital') === 'course'; }
    public function isDigital(): bool { return !$this->isCourse(); }

    public function creator(): BelongsTo { return $this->belongsTo(User::class, 'user_id'); }
    public function cover(): BelongsTo { return $this->belongsTo(FileEntry::class, 'cover_file_entry_id'); }
    public function files(): BelongsToMany { return $this->belongsToMany(FileEntry::class, 'digital_product_files')->withTimestamps(); }
    public function stores(): BelongsToMany
    {
        $pivot = Store::isTableRenameDone() ? 'digital_product_store' : 'digital_product_biolinks';
        return $this->belongsToMany(Store::class, $pivot, 'digital_product_id', 'biolink_id')->withTimestamps();
    }

    public function biolinks(): BelongsToMany { return $this->belongsToMany(Biolink::class, Store::isTableRenameDone() ? 'digital_product_store' : 'digital_product_biolinks', 'digital_product_id', 'biolink_id')->withTimestamps(); }
    public function orders(): HasMany { return $this->hasMany(StorefrontOrder::class); }
    public function views(): HasMany { return $this->hasMany(ProductView::class); }
    public function isApproved(): bool { return $this->status === 'approved'; }

    public function reviewRequestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'review_requested_by');
    }

    public function reviewEvents(): HasMany
    {
        return $this->hasMany(DigitalProductReviewEvent::class);
    }

    public function hasPendingUpdate(): bool
    {
        return $this->status === 'approved' && $this->review_requested_at !== null;
    }
}
