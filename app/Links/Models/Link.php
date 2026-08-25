<?php

namespace App\Links\Models;

use App\Links\Models\Concerns\HasShortUrlAttribute;
use App\Analytics\Models\TrackedEvent;
use App\Links\Resources\LinkResource;
use App\Biolinks\Models\Biolink;
use App\Stores\Models\Store;
use App\Folders\Models\Folder;
use App\Links\Models\Linkeable;
use App\Links\Models\LinkeableRule;
use App\LinkOverlays\Models\LinkOverlay;
use App\QrCodes\Models\QrCode;
use App\TrackingPixels\Models\TrackingPixel;
use App\Models\User;
use Common\Domains\CustomDomain;
use App\LinkPages\Models\LinkPage;
use App\Tags\Models\Tag;
use Common\Workspaces\Traits\BelongsToWorkspace;
use App\Links\Factories\LinkFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\MorphOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Hash;
use Laravel\Scout\Searchable;

class Link extends Linkeable
{
    use Searchable,
        SoftDeletes,
        HasFactory,
        HasShortUrlAttribute,
        BelongsToWorkspace;

    const MODEL_TYPE = 'link';
    const PLACEHOLDER_PASSWORD = '********';

    protected $guarded = [];
    protected $hidden = ['password'];
    protected $appends = ['short_url', 'model_type'];
    protected $attributes = ['type' => 'default'];

    protected $casts = [
        'id' => 'integer',
        'domain_id' => 'integer',
        'folder_id' => 'integer',
        'user_id' => 'integer',
        'expires_at' => 'datetime',
        'clicked_at' => 'datetime',
        'activates_at' => 'datetime',
    ];

    public function getFrontendRenderData(): array
    {
        return [
            'pageName' => 'link-page',
            'data' => new LinkResource($this, 'render'),
        ];
    }

    public function getRenderType(): string
    {
        if ($this->type === 'direct' && !$this->password) {
            if (!$this->hasRedirectDelayingProperties()) {
                return static::RENDER_TYPE_REDIRECT;
            } else {
                return static::RENDER_TYPE_REDIRECT_WITH_DELAY;
            }
        }

        return static::RENDER_TYPE_FRONTEND;
    }

    public function loadRelationsForRendering(): void
    {
        $relations = ['rules', 'pixels', 'domain'];

        if ($this->type === 'page') {
            $relations[] = 'linkPage';
        } elseif ($this->type === 'overlay') {
            $relations[] = 'overlay';
        }

        $this->load($relations);
    }

    public function rules(): MorphMany
    {
        return $this->morphMany(LinkeableRule::class, 'linkeable');
    }

    public function trackedEvents(): MorphMany
    {
        return $this->morphMany(TrackedEvent::class, 'linkeable');
    }

    public function tags(): MorphToMany
    {
        return $this->morphToMany(Tag::class, 'taggable');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function qrCode(): MorphOne
    {
        return $this->morphOne(QrCode::class, 'linkeable');
    }

    public function folder(): BelongsTo
    {
        return $this->belongsTo(Folder::class);
    }

    public function stores(): BelongsToMany
    {
        $pivot = Store::pivotTable();
        $pivotModel = Store::isTableRenameDone() ? \App\Stores\Models\StorePivot::class : \App\Biolinks\Models\BiolinkPivot::class;
        return $this->belongsToMany(Store::class, $pivot, 'link_id', 'biolink_id')->using($pivotModel)->withPivot(['position', 'animation', 'leap_until', 'active']);
    }

    public function biolinks(): BelongsToMany
    {
        return $this->belongsToMany(Biolink::class, Store::pivotTable(), 'link_id', 'biolink_id')->using(\App\Biolinks\Models\BiolinkPivot::class)->withPivot(['position', 'animation', 'leap_until', 'active']);
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

    public function linkPage(): BelongsTo
    {
        return $this->belongsTo(LinkPage::class, 'type_id');
    }

    public function overlay(): BelongsTo
    {
        return $this->belongsTo(LinkOverlay::class, 'type_id');
    }

    public function getLongUrlAttribute($value)
    {
        return parse_url($value, PHP_URL_SCHEME) === null
            ? "https://$value"
            : $value;
    }

    public function setPasswordAttribute($value)
    {
        $this->attributes['password'] = $value ? Hash::make($value) : null;
    }

    public function scopeWhereHash(Builder $builder, string $backHalf): Builder
    {
        return $builder->where('back_half', $backHalf);
    }

    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'back_half' => $this->back_half,
            'long_url' => $this->long_url,
            'description' => $this->description,
            'type' => $this->type,
            'folder_id' => $this->folder_id,
            'biolinks' => $this->relationLoaded('biolinks') ? $this->biolinks->pluck('id') : ($this->relationLoaded('stores') ? $this->stores->pluck('id') : collect()),
            'stores' => $this->relationLoaded('stores') ? $this->stores->pluck('id') : ($this->relationLoaded('biolinks') ? $this->biolinks->pluck('id') : collect()),
            'user_id' => $this->user_id,
            'created_at' => $this->created_at->timestamp ?? '_null',
            'updated_at' => $this->updated_at->timestamp ?? '_null',
            'expires_at' => $this->expires_at->timestamp ?? '_null',
            'is_archived' => $this->deleted_at !== null,
            'has_password' => $this->password !== null,
            'clicks_count' => $this->clicks_count,
            'tags' => $this->tags->map(function (Tag $tag) {
                return $tag->getSearchableValues();
            }),
            'workspace_id' => $this->workspace_id ?? '_null',
        ];
    }

    public function toNormalizedArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->short_url,
            'image' => $this->image,
        ];
    }

    protected function makeAllSearchableUsing($query)
    {
        return $query->with(['tags', 'biolinks', 'stores']);
    }

    public static function filterableFields(): array
    {
        return [
            'id',
            'type',
            'is_archived',
            'name',
            'long_url',
            'has_password',
            'active',
            'folder_id',
            'user_id',
            'created_at',
            'updated_at',
            'clicked_at',
            'expires_at',
            'clicks_count',
            'workspace_id',
        ];
    }

    public static function sortableFields(): array
    {
        return [
            'id',
            'name',
            'created_at',
            'updated_at',
            'clicked_at',
            'expires_at',
            'clicks_count',
        ];
    }

    public static function getModelTypeAttribute(): string
    {
        return Link::MODEL_TYPE;
    }

    protected static function newFactory()
    {
        return LinkFactory::new();
    }
}
