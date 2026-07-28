<?php

namespace Common\Logging\Error;

use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Http\Resources\Json\JsonResource;

#[SchemaName('ErrorLogItem')]
class ErrorLogItemResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->index,
            'index' => $this->index,
            'level' => strtolower($this->level),
            'datetime' => $this->datetime,
            'message' => $this->message,
            'exception' => $this->context['exception'] ?? null,
        ];
    }
}
