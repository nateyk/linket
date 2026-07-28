<?php

namespace App\Analytics\Actions;

use App\Biolinks\Models\Biolink;
use App\Links\Models\Link;
use App\Analytics\Models\TrackedEvent;
use App\Folders\Models\Folder;
use App\Models\User;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Common\Workspaces\Models\Workspace;
use Illuminate\Database\Eloquent\Builder;

class GetMonthlyClicks
{
    public function forUser(User $user): int
    {
        return $this->baseQuery()->where('user_id', $user->id)->count();
    }

    public function forWorkspace(Workspace $workspace): int
    {
        return $this->baseQuery()
            ->where('workspace_id', $workspace->id)
            ->count();
    }

    public function forLinkeable(Link|Folder|Biolink $linkeable): int
    {
        return $this->baseQuery()
            ->where('linkeable_id', $linkeable->id)
            ->where('linkeable_type', $linkeable::MODEL_TYPE)
            ->count();
    }

    protected function baseQuery(): Builder
    {
        $range = CarbonPeriod::create(
            Carbon::now()->startOfMonth(),
            '1 month',
            Carbon::now()->endOfMonth(),
        );
        return TrackedEvent::query()
            ->where('crawler', false)
            ->where('event_type', 'click')
            ->whereBetween('tracked_events.created_at', [
                $range->getStartDate(),
                $range->getEndDate(),
            ]);
    }
}
