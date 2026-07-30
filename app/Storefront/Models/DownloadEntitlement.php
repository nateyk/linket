<?php

namespace App\Storefront\Models;

use Common\Files\FileEntry;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DownloadEntitlement extends StorefrontModel
{
    protected $guarded = [];
    protected $casts = ['download_count' => 'integer', 'download_limit' => 'integer', 'expires_at' => 'datetime'];
    public function order(): BelongsTo { return $this->belongsTo(StorefrontOrder::class, 'storefront_order_id'); }
    public function file(): BelongsTo { return $this->belongsTo(FileEntry::class, 'file_entry_id'); }
}
