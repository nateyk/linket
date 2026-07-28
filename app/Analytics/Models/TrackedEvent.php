<?php

namespace App\Analytics\Models;

use App\Analytics\Factories\TrackedEventFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class TrackedEvent extends Model
{
    use HasFactory;

    protected $table = 'tracked_events';

    const UPDATED_AT = null;

    protected $guarded = [];

    public function linkeable(): MorphTo
    {
        return $this->morphTo('linkeable');
    }

    public static function filterableFields(): array
    {
        return [
            'id',
            'device',
            'browser',
            'platform',
            'location',
            'city',
            'state',
            'user_id',
            'domain_id',
            'event_type',
            'linkeable_type',
            'link_id',
            'folder_id',
            'biolink_id',
            'qr_code_id',
            'created_at',
            'workspace_id',
        ];
    }

    protected static function newFactory()
    {
        return TrackedEventFactory::new();
    }
}
