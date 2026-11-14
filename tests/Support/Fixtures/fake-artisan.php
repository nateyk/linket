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
            if (fwrite(STDOUT, str_repeat('r', 1000)."\n") === false) {
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
