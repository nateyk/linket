<?php

namespace App\HelpCenter\Visibility;

use App\Models\User;

final class HcVisibility
{
    /**
     * Guest visibility uses the actual guest role, not an empty list of roles.
     * Editors are checked for article permissions by the calling policy.
     */
    public static function canViewRole(?User $user, int|string|null $roleId): bool
    {
        if ($user?->isAgent() || $roleId === null || $roleId === '' || (int) $roleId === 0) {
            return true;
        }

        if ($user) {
            return $user->roles->contains('id', (int) $roleId);
        }

        return (int) (app('guestRole')?->id ?? 0) === (int) $roleId;
    }
}
