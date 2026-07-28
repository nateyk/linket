<?php

namespace Common\Logging\Schedule;

use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ScheduleLogItem
 */
#[SchemaName('ScheduleLogItem')]
class ScheduleLogItemResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'command' => $this->command,
            'output' => $this->output,
            'ran_at' => $this->ran_at,
            'duration' => $this->duration,
            'count_in_last_hour' => $this->count_in_last_hour,
            'exit_code' => $this->exit_code,
        ];
    }
}
