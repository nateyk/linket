<?php

namespace App\Folders\Models;

use App\Links\Models\Concerns\HasShortUrlAttribute;
use App\Links\Models\Link;
use App\Links\Models\Linkeable;
use App\Links\Models\LinkeableRule;
use App\QrCodes\Models\QrCode;
use App\TrackingPixels\Models\TrackingPixel;
use App\Models\User;
use App\Tags\Models\Tag;
use App\Analytics\Models\TrackedEvent;
use App\Folders\Factories\FolderFactory;
use App\Folders\Resources\FolderResource;
use App\Links\Resources\LinkResource;
use Common\Domains\CustomDomain;
use Common\Workspaces\Traits\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphOne;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Hash;
use Laravel\Scout\Searchable;

class Folder extends Linkeable
{
    const MODEL_TYPE = 'folder';

    use Searchable,
        HasFactory,
        SoftDeletes,
        HasShortUrlAttribute,
        BelongsToWorkspace;

    protected $guarded = [];
    protected $appends = ['model_type'];

    protected $casts = [
        'id' => 'integer',
        'user_id' => 'integer',
        'rotator' => 'boolean',
        'expires_at' => 'datetime',
        'activates_at' => 'datetime',
    ];

    public function getFrontendRenderData(): array
    {
        return [
            'pageName' => $this->rotator ? 'link-page' : 'folder-page',
            'linkeable' => $this->rotator
                ? new LinkResource($this->randomLink)
                : new FolderResource($this),
        ];
    }

    public function getRenderType(): string
    {
        if ($this->rotator) {
            $randomLink = $this->randomLink;
            return $randomLink->getRenderType();
        }

        return static::RENDER_TYPE_FRONTEND;
    }

    public function getDestinationUrlBeforeApplyingMutations(): string
    {
        return $this->short_url;
    }

    public function loadRelationsForRendering(): void
    {
        $this->load(['rules', 'pixels', 'domain']);
    }

    public function links(): HasMany
    {
        return $this->hasMany(Link::class);
    }

    public function tags(): MorphToMany
    {
        return $this->morphToMany(Tag::class, 'taggable');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function randomLink(): HasOne
    {
        return $this->hasOne(Link::class)->inRandomOrder();
    }

    public function rules(): MorphMany
    {
        return $this->morphMany(LinkeableRule::class, 'linkeable');
    }

    public function linkClicks(): HasManyThrough
    {
        return $this->hasManyThrough(
            TrackedEvent::class,
            Link::class,
            'folder_id',
            'linkeable_id',
            'id',
            'id',
        )->where('tracked_events.linkeable_type', Link::MODEL_TYPE);
    }

    public function trackedEvents(): MorphMany
    {
        return $this->morphMany(TrackedEvent::class, 'linkeable');
    }

    public function qrCode(): MorphOne
    {
        return $this->morphOne(QrCode::class, 'linkeable');
    }

    public function pixels(): BelongsToMany
    {
        return $this->morphToMany(
            TrackingPixel::class,
            'linkeable',
            'link_tracking_pixel',
        );
    }

    public function domain(): BelongsTo
    {
        return $this->belongsTo(CustomDomain::class, 'domain_id')->select([
            'id',
            'host',
        ]);
    }

    public function getHasPasswordAttribute()
    {
        return !!Arr::get($this->attributes, 'password');
    }

    public function setPasswordAttribute($value)
    {
        $this->attributes['password'] = $value ? Hash::make($value) : null;
    }

    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'user_id' => $this->user_id,
            'created_at' => $this->created_at->timestamp ?? '_null',
            'updated_at' => $this->updated_at->timestamp ?? '_null',
            'description' => $this->description,
            'workspace_id' => $this->workspace_id ?? '_null',
            'rotator' => $this->rotator,
            'links_count' => $this->links_count,
        ];
    }

    public function toNormalizedArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
        ];
    }

    public static function filterableFields(): array
    {
        return [
            'id',
            'name',
            'is_archived',
            'user_id',
            'created_at',
            'updated_at',
            'links_count',
            'workspace_id',
            'rotator',
        ];
    }

    public static function sortableFields(): array
    {
        return ['id', 'name', 'created_at', 'updated_at', 'links_count'];
    }

    public static function getModelTypeAttribute(): string
    {
        return static::MODEL_TYPE;
    }

    protected static function newFactory()
    {
        return FolderFactory::new();
    }
}
