<?php

namespace App\HelpCenter\Traits;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Auth;

trait FiltersByVisibleToRole
{
    public function scopeFilterByVisibleToRole(Builder $query): Builder
    {
        $visibleToRoleColumn = $query->getModel()->getTable().'.visible_to_role';

        return $query->where(function (Builder $query) use ($visibleToRoleColumn) {
            $query
                ->whereNull($visibleToRoleColumn)
                ->when(
                    Auth::user(),
                    fn($q) => $q->orWhereIn(
                        $visibleToRoleColumn,
                        Auth::user()?->roles->pluck('id'),
                    ),
                    function ($q) use ($visibleToRoleColumn) {
                        $guestRoleId = app('guestRole')?->id;
                        if ($guestRoleId !== null) {
                            $q->orWhere($visibleToRoleColumn, $guestRoleId);
                        }
                    },
                );
        });
    }
}
