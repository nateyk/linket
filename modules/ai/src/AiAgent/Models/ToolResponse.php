<?php

namespace Ai\AiAgent\Models;

use Illuminate\Database\Eloquent\Model;

class ToolResponse extends Model
{
    protected $guarded = [];

    public $timestamps = false;

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function aiAgentSession()
    {
        return $this->belongsTo(AiAgentSession::class);
    }

    public function getAsJson(): array|null
    {
        return json_decode($this->response, true);
    }
}
