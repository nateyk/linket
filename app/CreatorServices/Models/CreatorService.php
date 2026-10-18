<?php

namespace App\CreatorServices\Models;

use App\Models\User;
use App\Stores\Models\Store;
use Common\Files\FileEntry;
use Common\Workspaces\Traits\BelongsToWorkspace;
use Database\Factories\CreatorServiceFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class CreatorService extends Model
{
    use BelongsToWorkspace, HasFactory, SoftDeletes;

    protected $guarded = [];

    protected $casts = [
        'workspace_id' => 'integer',
        'user_id' => 'integer',
        'store_id' => 'integer',
        'cover_file_entry_id' => 'integer',
        'skills' => 'array',
        'contact_channels' => 'array',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class, 'store_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function cover(): BelongsTo
    {
        return $this->belongsTo(FileEntry::class, 'cover_file_entry_id');
    }

    public function images(): HasMany
    {
        return $this->hasMany(ServiceImage::class)->orderBy('position');
    }

    public function packages(): HasMany
    {
        return $this->hasMany(ServicePackage::class)->orderBy('position');
    }

    public function faqs(): HasMany
    {
        return $this->hasMany(ServiceFaq::class)->orderBy('position');
    }

    public function inquiries(): HasMany
    {
        return $this->hasMany(ServiceInquiry::class)->latest();
    }

    public function scopePublished(Builder $query): Builder
    {
        return $query->where('status', 'published');
    }

    public function publicUrl(): string
    {
        return rtrim((string) $this->store->short_url, '/').'/services/'.$this->slug;
    }

    protected static function newFactory(): CreatorServiceFactory
    {
        return CreatorServiceFactory::new();
    }
}
