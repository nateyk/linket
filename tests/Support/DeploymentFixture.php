<?php

namespace Tests\Support;

use Illuminate\Filesystem\Filesystem;
use Symfony\Component\Process\Process;

final class DeploymentFixture
{
    public string $root;

    public string $privateKey = '';

    public string $publicKey;

    public const SHA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

    public function __construct()
    {
        $this->root = sys_get_temp_dir().'/linket-deploy-permissions-'.bin2hex(random_bytes(8));
        mkdir($this->root, 0700);
        foreach (['shared/storage/app/digital-products', 'deploy', 'bin', 'source/public/build', 'source/vendor', 'releases/previous/bootstrap/cache', 'releases/previous/vendor'] as $directory) {
            mkdir($this->root.'/'.$directory, 0755, true);
        }

        $key = openssl_pkey_new(['private_key_bits' => 2048]);
        openssl_pkey_export($key, $this->privateKey);
        $this->publicKey = openssl_pkey_get_details($key)['key'];
        $this->write('shared/storage/oauth-private.key', $this->privateKey, 0600);
        $this->write('shared/storage/oauth-public.key', $this->publicKey, 0644);
        $this->write('shared/storage/app/digital-products/paid.pdf', 'synthetic paid content', 0600);
        chmod($this->root.'/shared/storage/app/digital-products', 0700);
        $this->environment();

        $autoload = '<?php require '.var_export(base_path('vendor/autoload.php'), true).';';
        $this->write('source/vendor/autoload.php', $autoload);
        $this->write('releases/previous/vendor/autoload.php', $autoload);
        $this->write('source/artisan', '<?php // Synthetic deployment boundary.');
        $this->write('source/RELEASE_SHA', self::SHA."\n");
        $this->write('source/CI_META', 'CI_SHA='.self::SHA."\n");
        $this->write('source/public/build/manifest.json', '{}');
        symlink($this->root.'/shared/storage', $this->root.'/releases/previous/storage');
        symlink($this->root.'/shared/.env', $this->root.'/releases/previous/.env');
        symlink($this->root.'/releases/previous', $this->root.'/current');

        foreach (glob(base_path('deploy/*')) as $script) {
            if (is_file($script)) {
                copy($script, $this->root.'/deploy/'.basename($script));
            }
        }

        $this->write('bin/php', <<<'SH'
#!/usr/bin/env bash
set -euo pipefail
if [[ "${1:-}" == -m ]]; then
  printf '%s\n' pdo_mysql mbstring openssl fileinfo curl zip bcmath
elif [[ "${1:-}" == artisan ]]; then
  exec "$REAL_PHP" "$FIXTURE_ROOT/fake-artisan.php" "$@"
else
  exec "$REAL_PHP" "$@"
fi
SH, 0700);
        $this->write('bin/mysqldump', "#!/usr/bin/env bash\nprintf '%s\\n' '-- synthetic isolated backup'\n", 0700);
        $this->write('bin/curl', "#!/usr/bin/env bash\nexit 0\n", 0700);
        $this->write('fake-artisan.php', <<<'PHP'
<?php
$root = getenv('FIXTURE_ROOT');
$command = $argv[2] ?? '';
$private = $root.'/shared/storage/oauth-private.key';
clearstatcache();
file_put_contents($root.'/commands.jsonl', json_encode([
    'command' => $command,
    'release' => basename(getcwd()),
    'private_mode' => is_file($private) ? fileperms($private) & 0777 : null,
])."\n", FILE_APPEND);
if ($command === 'migrate' && getenv('FAIL_MIGRATE')) { exit(1); }
if ($command === 'db:seed') {
    if (!in_array('--class=Common\\Database\\Seeders\\UploadBackendsSeeder', $argv, true)) {
        fwrite(STDERR, "Unexpected upload-backend seeder class\\n");
        exit(21);
    }
    if (getenv('FAIL_UPLOAD_SEED')) { exit(22); }
}
if ($command === 'route:list') {
    if (getenv('FAIL_ROUTE_LIST')) { exit(23); }
    if (getenv('LONG_ROUTE_LIST')) {
        // Exceed the pipe buffer to detect accidental truncation with head.
        for ($i = 0; $i < 2000; $i++) {
            if (fwrite(STDOUT, str_repeat('r', 1000)."\\n") === false) {
                exit(24);
            }
        }
    }
}
if ($command === 'optimize') {
    require getcwd().'/vendor/autoload.php';
    Dotenv\Dotenv::create(Illuminate\Support\Env::getRepository(), $root.'/shared')->load();
    $config = ['passport' => [
        'private_key' => Illuminate\Support\Env::get('PASSPORT_PRIVATE_KEY'),
        'public_key' => Illuminate\Support\Env::get('PASSPORT_PUBLIC_KEY'),
    ]];
    file_put_contents(getcwd().'/bootstrap/cache/config.php', '<?php return '.var_export($config, true).';');
    if (getenv('UNSAFE_CACHE')) { chmod(getcwd().'/bootstrap/cache/config.php', 0644); }
    if (getenv('UNSAFE_KEY')) { chmod($private, 0644); }
}
if ($command === 'deploy:health' && in_array('--post', $argv, true) && getenv('FAIL_POST')) { exit(1); }
PHP);
        $artifact = $this->root.'/linket-aaaaaaa-20261104-120000.tar.gz';
        (new Process(['tar', '-czf', $artifact, '-C', $this->root.'/source', '.']))->mustRun();
        file_put_contents($artifact.'.sha256', hash_file('sha256', $artifact).'  '.basename($artifact)."\n");
    }

    public function environment(string $extra = ''): void
    {
        $this->write('shared/.env', "APP_ENV=production\nDB_HOST=unused.invalid\nDB_PORT=3306\nDB_DATABASE=synthetic_test\nDB_USERNAME=synthetic\nDB_PASSWORD=synthetic\nQUEUE_CONNECTION=sync\nCREATOR_AI_MCP_OAUTH_ENABLED=false\nCREATOR_AI_MCP_HTTP_ENABLED=false\n".$extra, 0600);
    }

    public function write(string $path, string $content, int $mode = 0644): void
    {
        file_put_contents($this->root.'/'.$path, $content);
        chmod($this->root.'/'.$path, $mode);
    }

    public function mode(string $path): int
    {
        clearstatcache();

        return fileperms($this->root.'/'.$path) & 0777;
    }

    /** @param array<string, string|false> $environment */
    public function deploy(string $release = '20261104-120000-aaaaaaa', array $environment = []): Process
    {
        $process = new Process([
            'bash', $this->root.'/deploy/deploy.sh', '--release-id='.$release,
            '--expected-sha='.self::SHA, '--artifact='.$this->root.'/linket-aaaaaaa-20261104-120000.tar.gz',
            '--php-binary='.$this->root.'/bin/php', '--health-url=https://synthetic.invalid/up',
        ], $this->root, [
            'DEPLOY_PATH' => $this->root,
            'PATH' => $this->root.'/bin:'.getenv('PATH'),
            'FIXTURE_ROOT' => $this->root,
            'REAL_PHP' => PHP_BINARY,
            'APP_CONFIG_CACHE' => false,
            'APP_ENV' => false,
            'LARAVEL_STORAGE_PATH' => false,
            'PASSPORT_PRIVATE_KEY' => false,
            'PASSPORT_PUBLIC_KEY' => false,
            'CREATOR_AI_MCP_OAUTH_ENABLED' => false,
            'CREATOR_AI_MCP_HTTP_ENABLED' => false,
            'CREATOR_AI_MCP_TOKEN_HTTP_ENABLED' => false,
            ...$environment,
        ]);
        $process->setTimeout(30)->run();

        return $process;
    }

    /** @return list<array{command: string, release: string, private_mode: ?int}> */
    public function commands(): array
    {
        return array_map(fn (string $line): array => json_decode($line, true), file($this->root.'/commands.jsonl', FILE_IGNORE_NEW_LINES) ?: []);
    }

    public function cleanup(): void
    {
        (new Filesystem)->deleteDirectory($this->root);
    }
}
