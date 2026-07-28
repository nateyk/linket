<?php

namespace Common\Workspaces\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class WorkspaceDeleted
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        protected int $workspaceId,
        protected int $ownerId,
    ) {}
}
