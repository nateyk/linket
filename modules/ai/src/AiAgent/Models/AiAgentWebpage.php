<?php

namespace Ai\AiAgent\Models;

use Common\Core\BaseModel;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Laravel\Scout\Searchable;

class AiAgentWebpage extends BaseModel
{
    use Searchable;

    const MODEL_TYPE = 'aiAgentWebpage';

    protected $guarded = [];

    protected $casts = [
        'fully_scanned' => 'boolean',
        'scan_pending' => 'boolean',
        'scan_version' => 'integer',
        'scan_tries' => 'integer',
    ];

    protected static function booted()
    {
        parent::booted();

        static::creating(function (AiAgentWebpage $webpage) {
            if (!$webpage->url_hash) {
                $webpage->url_hash = static::hashUrl($webpage->url);
            }
            if (!$webpage->content_hash && $webpage->markdown) {
                $webpage->content_hash = static::hashContent(
                    $webpage->markdown,
                );
            }
        });
    }

    public function website(): BelongsTo
    {
        return $this->belongsTo(AiAgentWebsite::class, 'ai_agent_website_id');
    }

    public function chunks()
    {
        return $this->morphMany(AiAgentChunk::class, 'chunkable');
    }

    public static function deleteMultiple(Collection|array $webpageIds): void
    {
        DB::table('ai_agent_webpages')->whereIn('id', $webpageIds)->delete();

        DB::table('ai_agent_chunks')
            ->where('chunkable_type', AiAgentWebsite::MODEL_TYPE)
            ->whereIn('chunkable_id', $webpageIds)
            ->delete();
    }

    public function scopeSelectAllExceptContent(Builder $query): Builder
    {
        return $query->select([
            'id',
            'ai_agent_website_id',
            'url',
            'title',
            'url_hash',
            'content_hash',
            'fully_scanned',
            'scan_pending',
            'scan_version',
            'scan_started_at',
            'created_at',
            'updated_at',
        ]);
    }

    public static function hashUrl(string $url): string
    {
        return hash('xxh3', $url);
    }

    public static function hashContent(string $content): string
    {
        return hash('xxh3', $content);
    }

    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'url' => $this->url,
            'markdown' => $this->markdown,
            'created_at' => $this->created_at->timestamp ?? '_null',
            'updated_at' => $this->updated_at->timestamp ?? '_null',
        ];
    }

    public static function filterableFields(): array
    {
        return [
            'id',
            'created_at',
            'updated_at',
            'fully_scanned',
            'scan_pending',
        ];
    }

    public function toNormalizedArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->title,
            'description' => null,
            'image' => null,
            'model_type' => self::MODEL_TYPE,
        ];
    }

    public function toChunkableArray(): array|null
    {
        if ($this->title && $this->url) {
            return [
                'id' => $this->id,
                'title' => $this->title,
                'url' => $this->url,
            ];
        }

        return null;
    }

    public static function getModelTypeAttribute(): string
    {
        return self::MODEL_TYPE;
    }

    public static function sortableFields(): array
    {
        return [];
    }
}
