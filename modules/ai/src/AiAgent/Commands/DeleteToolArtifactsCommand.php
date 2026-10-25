<?php

namespace Ai\AiAgent\Commands;

use Ai\AiAgent\Models\ToolResponse;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class DeleteToolArtifactsCommand extends Command
{
    protected $signature = 'tool:delete-artifacts';

    public function handle(): void
    {
        $responseIds = ToolResponse::where('type', 'live')
            ->where('created_at', '<', now()->addHours(2))
            ->pluck('id');

        DB::table('ai_agent_session_tool_response')
            ->whereIn('tool_response_id', $responseIds)
            ->delete();

        ToolResponse::whereIn('id', $responseIds)->delete();

        $this->info("Deleted {$responseIds->count()} old tool responses.");
    }
}
