<?php

use App\CreatorAi\Writing\CreatorProductCopyDraftService;
use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Support\Facades\DB;

/**
 * No DatabaseTransactions: child processes need committed rows and separate
 * MySQL connections. Fixtures are deleted by this test on every exit path.
 */
test('independent MySQL writers cannot both consume the same approved AI copy revision', function (): void {
    $database = config('database.connections.'.config('database.default'));
    expect((string) ($database['database'] ?? ''))->toContain('test');
    expect(DB::transactionLevel())->toBe(0);
    if (($database['driver'] ?? '') !== 'mysql' || ! function_exists('proc_open')) {
        test()->markTestSkipped('Concurrent product-copy regression requires MySQL and proc_open.');
    }

    $creator = User::factory()->create(['email_verified_at' => now()]);
    $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
    $product = DigitalProduct::query()->create([
        'workspace_id' => $workspace->id,
        'user_id' => $creator->id,
        'title' => 'Two writers worksheet',
        'description' => 'Original copy.',
        'type' => 'digital',
        'status' => 'draft',
        'price_cents' => 100,
        'currency' => 'ETB',
    ]);
    $fingerprint = (new ReflectionMethod(CreatorProductCopyDraftService::class, 'fingerprint'))
        ->invoke(app(CreatorProductCopyDraftService::class), $product->fresh());
    $processes = [];
    try {
        DB::beginTransaction();
        try {
            DB::table('digital_products')->where('id', $product->id)->lockForUpdate()->firstOrFail();
            for ($i = 0; $i < 2; $i++) {
                $process = proc_open(
                    [PHP_BINARY, base_path('tests/Support/creator-ai-copy-save-worker.php')],
                    [['pipe', 'r'], ['pipe', 'w'], ['pipe', 'w']],
                    $pipes,
                    base_path(),
                );
                expect(is_resource($process))->toBeTrue();
                stream_set_timeout($pipes[1], 20);
                fwrite($pipes[0], json_encode([
                    'base' => base_path(),
                    'connection' => $database,
                    'creator' => $creator->id,
                    'product' => $product->id,
                    'fingerprint' => $fingerprint,
                ], JSON_THROW_ON_ERROR)."\n");
                fflush($pipes[0]);
                $processes[] = [$process, $pipes];
            }

            $connectionIds = [];
            foreach ($processes as [, $pipes]) {
                $ready = trim((string) fgets($pipes[1]));
                expect($ready)->toStartWith('ready:');
                $connectionIds[] = substr($ready, 6);
            }
            expect(count(array_unique($connectionIds)))->toBe(2);
            expect($connectionIds)->not->toContain((string) DB::selectOne('SELECT CONNECTION_ID() AS id')->id);

            foreach ($processes as [, $pipes]) {
                fwrite($pipes[0], "go\n");
                fflush($pipes[0]);
                expect(trim((string) fgets($pipes[1])))->toBe('attempting');
                fclose($pipes[0]);
            }
        } finally {
            DB::rollBack();
        }

        $codes = [];
        foreach ($processes as [$process, $pipes]) {
            $stderr = stream_get_contents($pipes[2]);
            fclose($pipes[1]);
            fclose($pipes[2]);
            $codes[] = proc_close($process);
            expect($stderr)->toBe('');
        }
        $processes = [];
        sort($codes);
        expect($codes)->toBe([0, 10]);
        expect($product->fresh()->description)->toBe('Parallel reviewed copy.')
            ->and($product->fresh()->content_revision)->toBe(1);
        expect($product->reviewEvents()->count())->toBe(1);
    } finally {
        if (DB::transactionLevel() > 0) {
            DB::rollBack();
        }
        foreach ($processes as [$process, $pipes]) {
            foreach ($pipes as $pipe) {
                if (is_resource($pipe)) {
                    fclose($pipe);
                }
            }
            if (is_resource($process)) {
                proc_terminate($process);
                proc_close($process);
            }
        }
        DB::table('digital_product_review_events')->where('digital_product_id', $product->id)->delete();
        $product->forceDelete();
        DB::table('workspace_user')->where('workspace_id', $workspace->id)->delete();
        $workspace->delete();
        $creator->delete();
    }
});
