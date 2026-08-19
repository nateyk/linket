<?php

namespace App\Biolinks\Models;

use App\Analytics\Models\TrackedEvent;
use App\Biolinks\Factories\BiolinkFactory;
use App\Biolinks\Resources\BiolinkResource;
use App\Links\Models\Concerns\HasShortUrlAttribute;
use App\Links\Models\Link;
use App\Links\Models\Linkeable;
use App\Links\Models\LinkeableRule;
use App\TrackingPixels\Models\TrackingPixel;
use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use App\Tags\Models\Tag;
use Common\Domains\CustomDomain;
use Common\Workspaces\Traits\BelongsToWorkspace;
use Illuminate\Contracts\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;
use Laravel\Scout\Searchable;

class Biolink extends Linkeable
{
    use Searchable,
        HasFactory,
        SoftDeletes,
        HasShortUrlAttribute,
        BelongsToWorkspace;

    const MODEL_TYPE = 'biolink';
    const BUILDER_MODE_LEGACY = 'legacy';
    const BUILDER_MODE_CREATOR_PROFILE = 'creator_profile';
    const CREATOR_WORK_ITEM_LIMIT = 6;

    protected $guarded = [];

    protected $attributes = [
        'builder_mode' => self::BUILDER_MODE_LEGACY,
    ];

    protected $casts = [
        'id' => 'integer',
        'domain_id' => 'integer',
        'user_id' => 'integer',
        'profile_config' => 'array',
        'expires_at' => 'datetime',
        'clicked_at' => 'datetime',
        'activates_at' => 'datetime',
    ];

    public function getFrontendRenderData(): array
    {
        return [
            'pageName' => 'biolink-page',
            'data' => new BiolinkResource($this),
        ];
    }

    public function getRenderType(): string
    {
        return static::RENDER_TYPE_FRONTEND;
    }

    public function getDestinationUrlBeforeApplyingMutations(): string
    {
        return $this->short_url;
    }

    public function loadRelationsForRendering(): void
    {
        $this->loadContent();
    }

    public function getFinalDestinationUrl(): string
    {
        $leapLink = $this->content->first(
            fn($item) => $item->model_type === Link::MODEL_TYPE &&
                $item->leap_until,
        );

        if ($leapLink) {
            return $leapLink->getFinalDestinationUrl();
        } else {
            return parent::getFinalDestinationUrl();
        }
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function links(): BelongsToMany
    {
        return $this->belongsToMany(
            BiolinkLink::class,
            'biolink_link',
            'biolink_id',
            'link_id',
        )
            ->using(BiolinkPivot::class)
            ->withPivot(['position', 'animation', 'leap_until', 'active']);
    }

    public function widgets(): HasMany
    {
        return $this->hasMany(BiolinkWidget::class);
    }

    public function digitalProducts(): BelongsToMany
    {
        return $this->belongsToMany(
            DigitalProduct::class,
            'digital_product_biolinks',
        )->withTimestamps();
    }

    public function appearance(): HasOne
    {
        return $this->hasOne(BiolinkAppearance::class);
    }

    public function rules(): MorphMany
    {
        return $this->morphMany(LinkeableRule::class, 'linkeable');
    }

    public function pixels(): BelongsToMany
    {
        return $this->morphToMany(
            TrackingPixel::class,
            'linkeable',
            'link_tracking_pixel',
        );
    }

    public function trackedEvents(): MorphMany
    {
        return $this->morphMany(TrackedEvent::class, 'linkeable');
    }

    public function tags(): MorphToMany
    {
        return $this->morphToMany(Tag::class, 'taggable');
    }

    public function domain(): BelongsTo
    {
        return $this->belongsTo(CustomDomain::class, 'domain_id')->select([
            'id',
            'host',
        ]);
    }

    public function loadContent(): self
    {
        $this->loadMissing([
            'widgets',
            'links' => fn(BelongsToMany $query) => $query->with([
                'rules',
                'pixels',
                'domain',
            ]),
            'appearance',
            'rules',
            'pixels',
            'domain',
            'user',
            'digitalProducts' => fn(BelongsToMany $query) => $query
                ->where('status', 'approved')
                ->whereNull('digital_products.deleted_at'),
        ]);

        return $this;
    }

    public function isCreatorProfile(): bool
    {
        return $this->builder_mode === self::BUILDER_MODE_CREATOR_PROFILE;
    }

    /** @return array<int> */
    public function creatorProfileSourceWidgetIds(): array
    {
        return collect($this->profile_config['source_widget_ids'] ?? [])
            ->filter(fn(mixed $id): bool => is_numeric($id))
            ->map(fn(mixed $id): int => (int) $id)
            ->values()
            ->all();
    }

    public function creatorWorkItemCount(): int
    {
        $widgetCount = $this->widgets()
            ->where('active', true)
            ->whereIn('type', ['image', 'text'])
            ->whereNotIn('id', $this->creatorProfileSourceWidgetIds())
            ->count();

        return $widgetCount + $this->links()->wherePivot('active', true)->count();
    }

    public function creatorWorkContent(): Collection
    {
        if (!$this->relationLoaded('links') || !$this->relationLoaded('widgets')) {
            return collect();
        }

        $sourceWidgetIds = $this->creatorProfileSourceWidgetIds();

        return $this->links
            ->concat($this->widgets)
            ->sortBy(
                fn(mixed $item): array => [
                    $item->pinned === 'top' ? 0 : 1,
                    $item->position,
                ],
            )
            ->filter(function (mixed $item) use ($sourceWidgetIds): bool {
                if (!$item->active) {
                    return false;
                }

                if ($item->model_type === BiolinkLink::MODEL_TYPE) {
                    return true;
                }

                return in_array($item->type, ['image', 'text'], true) &&
                    !in_array($item->id, $sourceWidgetIds, true);
            })
            ->take(self::CREATOR_WORK_ITEM_LIMIT)
            ->values();
    }

    public function publicItemCount(): int
    {
        $products = $this->relationLoaded('digitalProducts')
            ? $this->digitalProducts->count()
            : 0;

        if ($this->isCreatorProfile()) {
            return $products;
        }

        return $products + $this->creatorWorkContent()->count();
    }

    public function adjustPositions(
        $direction = 'decrement',
        int|null $anchor = null,
        int|null $linkToSkip = null,
        int|null $widgetToSkip = null,
    ) {
        $sign = $direction === 'decrement' ? '-' : '+';
        $this->links()
            ->newPivotStatement()
            ->where('biolink_id', $this->id)
            ->when(
                $linkToSkip,
                fn($query) => $query->where('link_id', '!=', $linkToSkip),
            )
            ->when(
                $anchor !== null,
                fn($query) => $query->where('position', '>=', $anchor),
            )
            ->update(['position' => DB::raw("position $sign 1")]);
        $this->widgets()
            ->when(
                $widgetToSkip,
                fn($query) => $query->where('id', '!=', $widgetToSkip),
            )
            ->when(
                $anchor !== null,
                fn($query) => $query->where('position', '>=', $anchor),
            )
            ->update(['position' => DB::raw("position $sign 1")]);
    }

    public function applyLeapLink(): void
    {
        $leapLink = $this->content->first(function ($item) {
            return $item->model_type === Link::MODEL_TYPE && $item->leap_until;
        });
        if ($leapLink) {
            $this->long_url = $leapLink->long_url;
        }
    }

    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'user_id' => $this->user_id,
            'created_at' => $this->created_at->timestamp ?? '_null',
            'updated_at' => $this->updated_at->timestamp ?? '_null',
            'workspace_id' => $this->workspace_id ?? '_null',
            'rotator' => $this->rotator,
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
            'active',
            'links_count',
            'workspace_id',
            'rotator',
            'type',
        ];
    }

    public static function sortableFields(): array
    {
        return [
            'id',
            'name',
            'created_at',
            'updated_at',
            'clicks_count',
            'links_count',
        ];
    }

    public static function getModelTypeAttribute(): string
    {
        return static::MODEL_TYPE;
    }

    protected static function newFactory()
    {
        return BiolinkFactory::new();
    }
}
