<?php

/** Separate PHP process and MySQL connection; credentials stay in anonymous pipes. */
$input = json_decode(fgets(STDIN), true, 512, JSON_THROW_ON_ERROR);
require dirname(__DIR__).'/bootstrap.php';
$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
config($input['config']);
Illuminate\Support\Facades\Http::preventStrayRequests();
if ($input['operation'] === 'approval') {
    Illuminate\Support\Facades\Cache::extend('file', static function (Illuminate\Contracts\Foundation\Application $app, array $config): Illuminate\Cache\Repository {
        $store = (new Tests\Support\ObservedMcpSessionLockStore($app['files'], $config['path'], $config['permission'] ?? null))
            ->setLockDirectory($config['lock_path'] ?? null);

        return new Illuminate\Cache\Repository($store);
    });
}
require base_path('routes/creator-ai-mcp-oauth.php');
Illuminate\Support\Facades\DB::statement('SET SESSION innodb_lock_wait_timeout = 5');
$connectionId = Illuminate\Support\Facades\DB::selectOne('SELECT CONNECTION_ID() AS id')->id;
$announced = false;
Illuminate\Support\Facades\DB::connection()->beforeExecuting(function (string $query) use (&$announced): void {
    if (! $announced && str_contains(strtolower($query), 'for update')) {
        $announced = true;
        fwrite(STDOUT, "attempting\n");
        fflush(STDOUT);
    }
});
fwrite(STDOUT, json_encode(['ready' => $connectionId], JSON_THROW_ON_ERROR)."\n");
fflush(STDOUT);
fgets(STDIN);
try {
    if ($input['operation'] === 'disconnect') {
        $creator = App\Models\User::query()->findOrFail($input['creator']);
        app(App\CreatorAi\Services\CreatorMcpConnectionRegistry::class)->revoke($creator, $input['connection']);
        $result = ['status' => 204];
    } else {
        $request = Illuminate\Http\Request::create(
            'https://linket.example.test/'.$input['path'], 'POST', $input['form'], $input['cookies'] ?? [], [],
            ['CONTENT_TYPE' => 'application/x-www-form-urlencoded', 'HTTP_ACCEPT' => 'application/json', 'REMOTE_ADDR' => '127.0.0.1'],
        );
        $kernel = app(Illuminate\Contracts\Http\Kernel::class);
        $response = $kernel->handle($request);
        $result = ['status' => $response->getStatusCode(), 'body' => json_decode($response->getContent(), true)];
        $kernel->terminate($request, $response);
    }
    fwrite(STDOUT, json_encode($result, JSON_THROW_ON_ERROR)."\n");
} catch (Throwable $error) {
    // Never print exception messages: they could contain SQL or credentials.
    fwrite(STDERR, get_class($error));
    exit(11);
}
