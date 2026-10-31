<?php

namespace App\Console\Commands;

use App\Models\User;
use Common\Permissions\Models\Permission;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class LocalAdminCommand extends Command
{
    protected $signature = 'linket:local-admin';

    protected $description = 'Create or promote a local DDEV administrator interactively';

    public function handle(): int
    {
        if (!app()->environment('local') || getenv('IS_DDEV_PROJECT') !== 'true' || DB::connection()->getDatabaseName() !== 'db') {
            $this->error('This command is restricted to the local DDEV Linket database.');
            return self::FAILURE;
        }

        if (!$this->input->isInteractive()) {
            $this->error('Interactive input is required.');
            return self::FAILURE;
        }

        $email = trim((string) $this->ask('Administrator email'));
        if (Validator::make(['email' => $email], ['email' => 'required|email|max:255'])->fails()) {
            $this->error('Enter a valid email address.');
            return self::FAILURE;
        }

        $user = User::query()->where('email', $email)->first();
        if ($user && $user->hasPermission('admin')) {
            $this->info('This account is already an administrator; no changes were made.');
            return self::SUCCESS;
        }
        if ($user && !$this->confirm('Promote this existing user without changing its password?', false)) {
            return self::FAILURE;
        }
        $password = null;
        if (!$user) {
            $password = (string) $this->secret('New administrator password (at least 12 characters)');
            $confirmation = (string) $this->secret('Confirm password');
            if (strlen($password) < 12 || !hash_equals($password, $confirmation)) {
                $this->error('Passwords must match and contain at least 12 characters.');
                return self::FAILURE;
            }
        }

        DB::transaction(function () use ($user, $email, $password): void {
            $user ??= User::query()->create([
                'name' => 'Local administrator', 'email' => $email,
                'password' => Hash::make($password), 'email_verified_at' => now(),
            ]);
            $permission = Permission::query()->firstOrCreate(['name' => 'admin']);
            $user->permissions()->syncWithoutDetaching([$permission->id]);
        });
        $this->info('Local administrator ready.');
        return self::SUCCESS;
    }
}
