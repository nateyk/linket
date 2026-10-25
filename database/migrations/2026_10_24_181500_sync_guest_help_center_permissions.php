<?php

use Common\Permissions\Models\Permission;
use Common\Roles\Models\Role;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration {
    /** @var list<string> */
    private array $guestHelpCenterPermissions = [
        'articles.view',
        'conversations.create',
        'files.create',
    ];

    public function up(): void
    {
        $guestRole = Role::query()->where('guests', true)->first();
        if (! $guestRole) {
            return;
        }

        foreach ($this->guestHelpCenterPermissions as $name) {
            $permission = Permission::query()->firstOrCreate(['name' => $name]);
            if (! $guestRole->permissions()->where('permissions.id', $permission->id)->exists()) {
                $guestRole->permissions()->attach($permission->id);
            }
        }
    }

    public function down(): void
    {
        // Non-destructive: keep permissions on guest role.
    }
};
