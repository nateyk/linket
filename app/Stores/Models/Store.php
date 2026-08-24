<?php

namespace App\Stores\Models;

use App\Analytics\Models\TrackedEvent;
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

class Store extends Linkeable
{
    use Searchable,
        HasFactory,
        SoftDeletes,
        HasShortUrlAttribute,
        BelongsToWorkspace;

    const MODEL_TYPE = 'store';
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

    public function getTable(): string
    {
        return config('stores.table_rename_done') ? 'stores' : 'biolinks';
    }

    public function getForeignKey(): string
    {
        return 'biolink_id';
    }

    protected static function newFactory()
    {
        return \Database\Factories\StoreFactory::new();
    }

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
        $pivotTable = config('stores.table_rename_done') ? 'store_link' : 'biolink_link';
        if (config('stores.table_rename_done')) {
            return $this->belongsToMany(
                StoreLink::class,
                $pivotTable,
                'biolink_id',
                'link_id',
            )
                ->using(StorePivot::class)
                ->withPivot(['position', 'animation', 'leap_until', 'active']);
        }
        // Phase1: legacy pivot and legacy Link class for BC with BiolinkResource type hints
        return $this->belongsToMany(
            \App\Biolinks\Models\BiolinkLink::class,
            $pivotTable,
            'biolink_id',
            'link_id',
        )
            ->using(\App\Biolinks\Models\BiolinkPivot::class)
            ->withPivot(['position', 'animation', 'leap_until', 'active']);
    }

    /**
     * Alias for legacy biolinks relation – keep for backward compat
     */
    public function biolinks(): BelongsToMany
    {
        return $this->links();
    }

    public function stores(): BelongsToMany
    {
        return $this->links();
    }

    public function widgets(): HasMany
    {
        if (config('stores.table_rename_done')) {
            return $this->hasMany(StoreWidget::class, 'biolink_id');
        }
        return $this->hasMany(\App\Biolinks\Models\BiolinkWidget::class, 'biolink_id');
    }

    /**
     * Legacy alias for widgets using old model
     */
    public function biolinkWidgets(): HasMany
    {
        return $this->hasMany(\App\Biolinks\Models\BiolinkWidget::class, 'biolink_id');
    }

    public function digitalProducts(): BelongsToMany
    {
        $pivot = config('stores.table_rename_done') ? 'digital_product_store' : 'digital_product_biolinks';
        return $this->belongsToMany(
            DigitalProduct::class,
            $pivot,
            'biolink_id',
            'digital_product_id',
        )->withTimestamps();
    }

    /**
     * Legacy alias – biolinks() for DigitalProduct pivot compat
     */
    public function biolinkDigitalProducts(): BelongsToMany
    {
        return $this->digitalProducts();
    }

    public function appearance(): HasOne
    {
        if (config('stores.table_rename_done')) {
            return $this->hasOne(StoreAppearance::class, 'biolink_id');
        }
        return $this->hasOne(\App\Biolinks\Models\BiolinkAppearance::class, 'biolink_id');
    }

    public function storeAppearance(): HasOne
    {
        return $this->hasOne(StoreAppearance::class, 'biolink_id');
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

                if ($item->model_type === StoreLink::MODEL_TYPE || $item->model_type === Link::MODEL_TYPE || $item->model_type === 'biolinkLink') {
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
        $pivotTable = config('stores.table_rename_done') ? 'store_link' : 'biolink_link';
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
            'model_type' => 'store',
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

    /**
     * Scout – keep batches importable (500) and ensure soft-delete handling.
     */
    protected function makeAllSearchableUsing($query)
    {
        return $query->with(['tags']);
    }

    public function searchableAs(): string
    {
        $prefix = config('scout.prefix') ?? '';
        return $prefix . 'stores';
    }


}
