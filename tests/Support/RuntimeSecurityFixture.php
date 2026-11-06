<?php

namespace Tests\Support;

use Illuminate\Filesystem\Filesystem;
use Symfony\Component\Process\Process;

final class RuntimeSecurityFixture
{
    public string $root;

    /** @var array{account_uid:int,roles:array<string,array{uid:int,gid:int,groups:list<int>,umask?:string}>,key_source:string,private_key:string,public_key:string,rollback_release?:string} */
    public array $inventory;

    public function __construct()
    {
        $this->root = sys_get_temp_dir().'/linket-runtime-audit-'.bin2hex(random_bytes(8));
        mkdir($this->root, 0755);
        chmod($this->root, 0755);
        foreach (['shared/storage/app/public/avatars', 'shared/storage/app/digital-products', 'shared/storage/framework/cache', 'shared/storage/framework/sessions', 'shared/storage/framework/views', 'shared/storage/logs', 'releases/current-release/public', 'releases/current-release/bootstrap/cache', 'releases/previous/public', 'releases/previous/bootstrap/cache'] as $directory) {
            mkdir($this->root.'/'.$directory, 0755, true);
        }
        foreach (['shared/storage/app/digital-products', 'shared/storage/framework', 'shared/storage/framework/cache', 'shared/storage/framework/sessions', 'shared/storage/framework/views', 'shared/storage/logs', 'releases/current-release/bootstrap/cache', 'releases/previous/bootstrap/cache'] as $directory) {
            chmod($this->root.'/'.$directory, 0700);
        }
        $this->write('shared/.env', 'PASSPORT_PRIVATE_KEY="synthetic-environment-secret-must-not-be-read"', 0600);
        $this->write('shared/storage/oauth-private.key', 'synthetic-private-key-must-not-be-read', 0600);
        $this->write('shared/storage/oauth-public.key', 'synthetic-public-key', 0600);
        $this->write('shared/storage/app/digital-products/paid.pdf', 'synthetic private purchase', 0600);
        $this->write('shared/storage/app/public/avatars/test.jpg', 'synthetic public media', 0644);
        foreach (['current-release', 'previous'] as $release) {
            $this->write('releases/'.$release.'/bootstrap/cache/config.php', '<?php throw new RuntimeException("cached-configuration-must-not-be-executed");', 0600);
            symlink($this->root.'/shared/storage', $this->root.'/releases/'.$release.'/storage');
            symlink($this->root.'/shared/.env', $this->root.'/releases/'.$release.'/.env');
            symlink($this->root.'/shared/storage/app/public', $this->root.'/releases/'.$release.'/public/storage');
        }
        symlink($this->root.'/releases/current-release', $this->root.'/current');
        $owner = fileowner($this->root);
        $group = filegroup($this->root);
        $identity = ['uid' => $owner, 'gid' => $group, 'groups' => [$group], 'umask' => '0077'];
        $cliGroups = function_exists('posix_getgroups') ? posix_getgroups() : [$group];
        $this->inventory = [
            'account_uid' => $owner,
            'roles' => [
                'cli' => [...$identity, 'groups' => $cliGroups], 'php_fpm' => [...$identity, 'umask' => '0022'],
                'queue' => $identity, 'scheduler' => $identity,
                'web' => ['uid' => $owner + 10000, 'gid' => $group + 10000, 'groups' => [], 'umask' => '0022'],
                'unauthorized' => ['uid' => $owner + 20000, 'gid' => $group + 20000, 'groups' => [], 'umask' => '0022'],
            ],
            'key_source' => 'file',
            'private_key' => 'shared/storage/oauth-private.key',
            'public_key' => 'shared/storage/oauth-public.key',
            'rollback_release' => 'previous',
        ];
    }

    public function write(string $path, string $contents, int $mode): void
    {
        file_put_contents($this->root.'/'.$path, $contents);
        chmod($this->root.'/'.$path, $mode);
    }

    public function audit(?string $input = null): Process
    {
        $process = new Process([PHP_BINARY, base_path('deploy/runtime-preflight.php'), $this->root]);
        $process->setInput($input ?? json_encode($this->inventory, JSON_THROW_ON_ERROR));
        $process->setTimeout(10)->run();

        return $process;
    }

    public function cleanup(): void
    {
        (new Filesystem)->deleteDirectory($this->root);
    }
}
