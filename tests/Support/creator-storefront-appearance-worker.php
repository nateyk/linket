<?php

/** Separate PHP/MySQL process for the synthetic storefront save race only. */
$input = json_decode((string) fgets(STDIN), true, 512, JSON_THROW_ON_ERROR);
require dirname(__DIR__).'/bootstrap.php';
$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$dbName = (string) Illuminate\Support\Facades\DB::connection()->getDatabaseName();
if (config('app.env') !== 'testing'
    || Illuminate\Support\Facades\DB::getDriverName() !== 'mysql'
    || !str_contains($dbName, 'test')) {
    fwrite(STDERR, 'Unsafe database or environment.');
    exit(10);
}

config($input['config']);
Illuminate\Support\Facades\DB::statement('SET SESSION innodb_lock_wait_timeout = 5');
$connection = Illuminate\Support\Facades\DB::selectOne('SELECT CONNECTION_ID() AS id')->id;
fwrite(STDOUT, json_encode(['ready' => $connection], JSON_THROW_ON_ERROR)."\n");
fflush(STDOUT);
fgets(STDIN);

$announced = false;
Illuminate\Support\Facades\DB::connection()->beforeExecuting(
    function (string $query) use (&$announced): void {
        if (!$announced && str_contains(strtolower($query), 'for update')) {
            $announced = true;
            fwrite(STDOUT, "attempting\n");
            fflush(STDOUT);
        }
    },
);

try {
    $creator = App\Models\User::query()->findOrFail($input['creator_id']);
    Illuminate\Support\Facades\Auth::guard('web')->setUser($creator);

    $request = Illuminate\Http\Request::create(
        '/api/v1/stores/'.$input['store_id'].'/appearance',
        'POST',
        [
            'config' => $input['appearance'],
            'source_fingerprint' => $input['source_fingerprint'],
        ],
    );
    $route = new Illuminate\Routing\Route(
        'POST',
        'api/v1/stores/{store}/appearance',
        [App\Stores\Controllers\StoreAppearanceController::class, 'update'],
    );
    $route->bind($request);
    $request->setRouteResolver(static fn () => $route);
    $request->setUserResolver(static fn () => $creator);

    app(App\Stores\Controllers\StoreAppearanceController::class)->update($request);
    $status = 200;
} catch (Symfony\Component\HttpKernel\Exception\HttpExceptionInterface $error) {
    $status = $error->getStatusCode();
} catch (Illuminate\Auth\Access\AuthorizationException) {
    $status = 403;
} catch (Throwable $error) {
    // No exception messages, SQL, credentials or creator data leave the worker.
    fwrite(STDERR, get_class($error));
    exit(11);
}

fwrite(STDOUT, json_encode(['status' => $status], JSON_THROW_ON_ERROR)."\n");
fflush(STDOUT);
