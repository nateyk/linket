<?php

/** Independent CLI writer for the MySQL AI product-copy serialization test. */
$input = json_decode((string) fgets(STDIN), true, 512, JSON_THROW_ON_ERROR);

require $input['base'].'/vendor/autoload.php';
$app = require $input['base'].'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

config([
    'app.key' => $input['app_key'],
    'database.default' => 'copy_race_test',
    'database.connections.copy_race_test' => $input['connection'],
    'creator_ai.enabled' => true,
    'creator_ai.features.writing_basic' => true,
]);
if (!str_contains((string) config('database.connections.copy_race_test.database'), 'test')) {
    exit(12);
}

$connectionId = Illuminate\Support\Facades\DB::selectOne('SELECT CONNECTION_ID() AS id')->id;
fwrite(STDOUT, "ready:".$connectionId."\n");
fflush(STDOUT);
fgets(STDIN);
fwrite(STDOUT, "attempting\n");
fflush(STDOUT);

try {
    $creator = App\Models\User::query()->findOrFail($input['creator']);
    $product = App\Storefront\Models\DigitalProduct::query()->findOrFail($input['product']);
    app(App\Storefront\DigitalProductMutationService::class)->update(
        $product,
        [
            'title' => $product->title,
            'description' => 'Parallel reviewed copy.',
            'type' => 'digital',
            'file_ids' => [],
            'biolink_ids' => [],
            ...($input['draft_id'] ? [
                'ai_copy_draft_id' => $input['draft_id'],
                'ai_copy_draft_version' => 1,
                'ai_copy_source_fingerprint' => $input['fingerprint'],
            ] : []),
        ],
        null,
        $creator,
        $input['fingerprint'],
    );
    exit(0);
} catch (Symfony\Component\HttpKernel\Exception\HttpExceptionInterface $exception) {
    exit($exception->getStatusCode() === 409 ? 10 : 11);
} catch (Throwable $exception) {
    fwrite(STDERR, get_class($exception).': '.$exception->getMessage()."\n");
    exit(11);
}
