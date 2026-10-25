<?php

namespace Ai\AiAgent\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AiAgentWebsite extends Model
{
    const MODEL_TYPE = 'aiAgentWebsite';

    protected $guarded = [];

    protected $casts = [
        'scan_pending' => 'boolean',
        'scan_version' => 'integer',
        'scrape_config' => 'array',
    ];

    protected static function booted()
    {
        parent::booted();

        static::creating(function (AiAgentWebsite $website) {
            if (!$website->url_hash) {
                $website->url_hash = static::hashUrl($website->url);
            }
        });
    }

    public function hasPageWithContent(
        string $hash,
        ?int $exceptId = null,
    ): bool {
        return $this->webpages()
            ->where('content_hash', $hash)
            ->when(
                $exceptId,
                fn($query) => $query->where('id', '!=', $exceptId),
            )
            ->exists();
    }

    public function isSinglePage(): bool
    {
        return $this->scan_type === 'single';
    }

    public function syncIsInProgress(): bool
    {
        return $this->scan_pending;
    }

    public function webpages(): HasMany
    {
        return $this->hasMany(AiAgentWebpage::class);
    }

    public static function hashUrl(string $url): string
    {
        return AiAgentWebpage::hashUrl($url);
    }
}
