<?php

namespace App\HelpCenter\Traits;

use App\HelpCenter\Models\HcCategory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Auth;

trait FiltersByVisibleToRole
{
    public function scopeFilterByVisibleToRole(Builder $query, bool $forGuest = false): Builder
    {
        $user = $forGuest ? null : Auth::user();
        if ($user?->isAgent()) {
            return $query;
        }

        $roleIds = $user
            ? $user->roles->pluck('id')->all()
            : array_filter([app('guestRole')?->id]);

        $column = $query->getModel()->qualifyColumn('visible_to_role');
        $query->where(function (Builder $sub) use ($column, $roleIds) {
            $sub->whereNull($column);
            if ($roleIds) {
                $sub->orWhereIn($column, $roleIds);
            }
        });

        // A public section under a role-restricted parent is not public.
        // Use a subquery rather than a self-relation alias to avoid filtering
        // the outer category instead of its parent.
        if ($query->getModel() instanceof HcCategory) {
            $query->where(function (Builder $sub) use ($roleIds) {
                $sub->whereNull('categories.parent_id')
                    ->orWhereIn('categories.parent_id', function ($parents) use ($roleIds) {
                        $parents->select('id')
                            ->from('categories as hc_visible_parents')
                            ->where(function ($visible) use ($roleIds) {
                                $visible->whereNull('hc_visible_parents.visible_to_role');
                                if ($roleIds) {
                                    $visible->orWhereIn('hc_visible_parents.visible_to_role', $roleIds);
                                }
                            });
                    });
            });
        }

        return $query;
    }
}
