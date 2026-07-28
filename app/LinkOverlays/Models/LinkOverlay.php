<?php

namespace App\LinkOverlays\Models;

use App\LinkOverlays\Factories\LinkOverlayFactory;
use App\Models\User;
use Common\Core\BaseModel;
use Common\Workspaces\Traits\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Laravel\Scout\Searchable;

class LinkOverlay extends BaseModel
{
    use Searchable, BelongsToWorkspace, HasFactory, SoftDeletes;

    protected $guarded = [];
    protected $casts = [
        'id' => 'integer',
        'user_id' => 'integer',
    ];
    protected $appends = ['model_type'];

    const MODEL_TYPE = 'linkOverlay';

    public function setColorsAttribute($value)
    {
        if ($value && is_array($value)) {
            $this->attributes['colors'] = json_encode($value);
        }
    }

    public function getColorsAttribute($value)
    {
        if ($value && is_string($value)) {
            return json_decode($value, true);
        } else {
            return [];
        }
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'message' => $this->message,
            'label' => $this->label,
            'btn_link' => $this->btn_link,
            'btn_text' => $this->btn_text,
            'user_id' => $this->user_id,
            'created_at' => $this->created_at->timestamp ?? '_null',
            'updated_at' => $this->updated_at->timestamp ?? '_null',
            'theme' => $this->theme,
            'workspace_id' => $this->workspace_id ?? '_null',
        ];
    }

    public function toNormalizedArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->message,
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
            'theme',
            'workspace_id',
        ];
    }

    public static function sortableFields(): array
    {
        return ['id', 'name', 'created_at', 'updated_at'];
    }

    public static function getModelTypeAttribute(): string
    {
        return static::MODEL_TYPE;
    }

    protected static function newFactory()
    {
        return LinkOverlayFactory::new();
    }
}
