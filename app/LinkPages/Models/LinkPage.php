<?php

namespace App\LinkPages\Models;

use App\Models\User;
use Common\Core\BaseModel;
use Common\Files\Traits\HasAttachedFileEntries;
use Common\Workspaces\Traits\BelongsToWorkspace;
use App\LinkPages\Factories\LinkPageFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Laravel\Scout\Searchable;

class LinkPage extends BaseModel
{
    use BelongsToWorkspace,
        HasAttachedFileEntries,
        HasFactory,
        Searchable,
        SoftDeletes;

    const MODEL_TYPE = 'linkPage';

    protected $table = 'link_pages';

    protected $guarded = [];

    protected $casts = [
        'id' => 'integer',
        'user_id' => 'integer',
        'hide_footer' => 'boolean',
        'hide_navbar' => 'boolean',
        'deleted_at' => 'datetime',
    ];

    protected $appends = ['model_type'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function inlineImages()
    {
        return $this->attachedFileEntriesRelation('inline_image');
    }

    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'body' => $this->body,
            'created_at' => $this->created_at->timestamp ?? '_null',
            'updated_at' => $this->updated_at->timestamp ?? '_null',
            'deleted_at' => $this->deleted_at->timestamp ?? '_null',
            'user_id' => $this->user_id,
            'workspace_id' => $this->workspace_id ?? '_null',
        ];
    }

    public function toNormalizedArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => Str::limit($this->body, 100),
            'model_type' => static::MODEL_TYPE,
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
            'workspace_id',
        ];
    }

    public static function sortableFields(): array
    {
        return ['id', 'title', 'created_at', 'updated_at'];
    }

    public static function getModelTypeAttribute(): string
    {
        return static::MODEL_TYPE;
    }

    protected static function newFactory()
    {
        return LinkPageFactory::new();
    }
}
