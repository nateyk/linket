<?php

namespace App\QrCodes\Models;

use App\Analytics\Models\TrackedEvent;
use App\Links\Models\Linkeable;
use App\Links\Models\LinkeableRule;
use App\TrackingPixels\Models\TrackingPixel;
use App\Models\User;
use App\QrCodes\Factories\QrCodeFactory;
use App\QrCodes\Resources\QrCodeResource;
use App\Tags\Models\Tag;
use Carbon\Carbon;
use Common\Domains\CustomDomain;
use Common\Workspaces\Traits\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Laravel\Scout\Searchable;

class QrCode extends Linkeable
{
    use Searchable, SoftDeletes, BelongsToWorkspace, HasFactory;

    const MODEL_TYPE = 'qrCode';

    protected $guarded = [];
    protected $appends = ['model_type'];

    protected $casts = [
        'id' => 'integer',
        'user_id' => 'integer',
        'expires_at' => 'datetime',
        'scanned_at' => 'datetime',
        'activates_at' => 'datetime',
        'style' => 'array',
    ];

    public function loadRelationsForRendering(): void
    {
        if ($this->linkeable_id) {
            $this->loadMissing('linkeable');

            if ($this->linkeable) {
                $this->linkeable->loadRelationsForRendering();
            }
        }
    }

    public function getFrontendRenderData(): array
    {
        if ($this->hasLinkeable()) {
            return $this->linkeable->getFrontendRenderData();
        }

        return [
            'pageName' => 'qr-code-page',
            'data' => new QrCodeResource($this),
        ];
    }

    public function getRenderType(): string
    {
        if ($this->hasLinkeable()) {
            return $this->linkeable->getRenderType();
        } else {
            if ($this->password) {
                return static::RENDER_TYPE_FRONTEND;
            } elseif ($this->hasRedirectDelayingProperties()) {
                return static::RENDER_TYPE_REDIRECT_WITH_DELAY;
            } else {
                return static::RENDER_TYPE_REDIRECT;
            }
        }
    }

    protected function getDestinationUrlBeforeApplyingMutations(): string
    {
        if ($this->hasLinkeable() && $this->linkeable->long_url) {
            return $this->linkeable->long_url;
        }

        return $this->long_url;
    }

    public function getRetargetingRules(): Collection
    {
        if ($this->hasLinkeable()) {
            return $this->linkeable->getRetargetingRules();
        }

        return $this->rules;
    }

    public function getDestinationUtmString(): string
    {
        if ($this->hasLinkeable()) {
            return $this->linkeable->getDestinationUtmString();
        }

        return $this->utm ?? '';
    }

    public function getExpirationDate(): ?Carbon
    {
        if ($this->hasLinkeable()) {
            return $this->linkeable->getExpirationDate();
        }

        return $this->expires_at;
    }

    public function getActivationDate(): ?Carbon
    {
        if ($this->hasLinkeable()) {
            return $this->linkeable->getActivationDate();
        }

        return $this->activates_at;
    }

    public function getTrackingPixels(): Collection
    {
        if ($this->hasLinkeable()) {
            return $this->linkeable->getTrackingPixels();
        }

        return $this->pixels;
    }

    public function getDomainId(): int|null
    {
        if ($this->hasLinkeable()) {
            return $this->linkeable->getDomainId();
        }

        return $this->domain_id;
    }

    public function getDomain(): CustomDomain|null
    {
        if ($this->hasLinkeable()) {
            return $this->linkeable->getDomain();
        }

        return parent::getDomain();
    }

    public function getPassword(): string|null
    {
        if ($this->hasLinkeable()) {
            return $this->linkeable->getPassword();
        }

        return $this->password;
    }

    protected function longUrl(): Attribute
    {
        return Attribute::make(
            get: function ($value) {
                if ($this->hasLinkeable() && $this->linkeable->long_url) {
                    return $this->linkeable->long_url;
                }
                return $value;
            },
        );
    }

    protected function name(): Attribute
    {
        return Attribute::make(
            get: function ($value) {
                if ($this->hasLinkeable() && $this->linkeable->name) {
                    return $this->linkeable->name;
                }
                return $value;
            },
        );
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function linkeable(): MorphTo
    {
        return $this->morphTo('linkeable');
    }

    protected function hasLinkeable(): bool
    {
        return $this->exists &&
            $this->linkeable_id &&
            $this->relationLoaded('linkeable') &&
            $this->linkeable;
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

    public function pixels(): BelongsToMany
    {
        return $this->morphToMany(
            TrackingPixel::class,
            'linkeable',
            'link_tracking_pixel',
        );
    }

    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'long_url' => $this->long_url,
            'user_id' => $this->user_id,
            'created_at' => $this->created_at->timestamp ?? '_null',
            'updated_at' => $this->updated_at->timestamp ?? '_null',
            'tags' => $this->tags->map(
                fn(Tag $tag) => $tag->getSearchableValues(),
            ),
            'workspace_id' => $this->workspace_id ?? '_null',
        ];
    }

    public function toNormalizedArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->url,
        ];
    }

    public static function filterableFields(): array
    {
        return [
            'id',
            'linkeable_type',
            'name',
            'expires_at',
            'is_archived',
            'user_id',
            'created_at',
            'updated_at',
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
            'expires_at',
            'scans_count',
        ];
    }

    public static function getModelTypeAttribute(): string
    {
        return static::MODEL_TYPE;
    }

    protected function makeAllSearchableUsing($query)
    {
        return $query->with(['tags']);
    }

    protected static function newFactory()
    {
        return QrCodeFactory::new();
    }
}
