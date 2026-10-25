<?php

namespace Ai\AiAgent\Middleware;

use App\Conversations\Models\Conversation;
use Closure;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use App\Core\WidgetFlags;

class ScopeConversationsToPreviewMode
{
    public function handle(Request $request, Closure $next)
    {
        if (WidgetFlags::isAiAgentPreviewMode()) {
            Conversation::addGlobalScope('isPreviewMode', function (
                Builder $builder,
            ) {
                $builder->where('mode', Conversation::MODE_PREVIEW);
            });
        }

        return $next($request);
    }
}
