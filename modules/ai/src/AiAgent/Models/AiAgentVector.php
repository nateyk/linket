<?php

namespace Ai\AiAgent\Models;

use Illuminate\Database\Eloquent\Model;

class AiAgentVector extends Model
{
    const MODEL_TYPE = 'aiAgentVector';

    protected $guarded = ['id'];

    public function chunks()
    {
        return $this->hasMany(AiAgentChunk::class, 'vector_id');
    }
}
