<?php

use App\Payments\Models\DirectPaymentVerification;
use App\Storefront\Models\CommissionInvoice;
use App\Storefront\Models\StorefrontOrder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

it('allows only one concurrent cross-purpose claim of a transaction', function (): void {
    Http::preventStrayRequests();
    $connection = config('database.connections.' . config('database.default'));
    if (($connection['driver'] ?? null) !== 'mysql' || !function_exists('proc_open')) {
        test()->markTestSkipped('Concurrent claim test requires MySQL and proc_open.');
    }
    expect(strtolower((string) $connection['database']))->toContain('test');
    $identity = 'SYNTHETIC' . Str::upper(Str::random(20));
    $ids = [];
    $processes = [];
    $program = <<<'PHP'
$input = json_decode(fgets(STDIN), true, 512, JSON_THROW_ON_ERROR);
fgets(STDIN);
try {
    $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $input['host'], $input['port'], $input['database']);
    $pdo = new PDO($dsn, $input['username'], $input['password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $query = $pdo->prepare('UPDATE direct_payment_verifications SET canonical_transaction_identity = ? WHERE id = ?');
    $query->execute([$input['identity'], $input['id']]);
    exit(0);
} catch (PDOException $exception) {
    exit($exception->getCode() === '23000' ? 10 : 11);
}
PHP;
    try {
        foreach ([StorefrontOrder::class, CommissionInvoice::class] as $payableType) {
            $verification = DirectPaymentVerification::query()->create([
                'reference' => 'SYNTH-' . Str::uuid(), 'payable_type' => $payableType, 'payable_id' => 0,
                'bank_code' => 'telebirr', 'settlement_account' => '0000000000', 'amount_cents' => 100, 'currency' => 'ETB',
            ]);
            $ids[] = $verification->id;
            $process = proc_open([PHP_BINARY, '-r', $program], [['pipe', 'r'], ['pipe', 'w'], ['pipe', 'w']], $pipes);
            expect(is_resource($process))->toBeTrue();
            fwrite($pipes[0], json_encode([
                'host' => $connection['host'], 'port' => $connection['port'] ?? 3306,
                'database' => $connection['database'], 'username' => $connection['username'],
                'password' => $connection['password'], 'identity' => $identity, 'id' => $verification->id,
            ], JSON_THROW_ON_ERROR) . "\n");
            fflush($pipes[0]);
            $processes[] = [$process, $pipes];
        }
        foreach ($processes as [, $pipes]) {
            fwrite($pipes[0], "go\n");
            fclose($pipes[0]);
        }
        $exitCodes = [];
        foreach ($processes as [$process, $pipes]) {
            stream_get_contents($pipes[1]);
            stream_get_contents($pipes[2]);
            fclose($pipes[1]);
            fclose($pipes[2]);
            $exitCodes[] = proc_close($process);
        }
        $processes = [];
        sort($exitCodes);
        expect($exitCodes)->toBe([0, 10])
            ->and(DirectPaymentVerification::query()->whereIn('id', $ids)->where('canonical_transaction_identity', $identity)->count())->toBe(1);
    } finally {
        foreach ($processes as [$process, $pipes]) {
            foreach ($pipes as $pipe) {
                if (is_resource($pipe)) {
                    fclose($pipe);
                }
            }
            proc_terminate($process);
            proc_close($process);
        }
        DirectPaymentVerification::query()->whereIn('id', $ids)->delete();
    }
});

it('serializes separate-process reservations for the final creator allowance', function (): void {
    $connection = config('database.connections.'.config('database.default'));
    expect($connection['database'])->toContain('test');
    $creator = \App\Models\User::factory()->create();
    $workspace = \Common\Workspaces\Models\Workspace::query()->create(['owner_id' => $creator->id, 'name' => 'Quota race', 'is_personal' => true]);
    $product = \App\Storefront\Models\DigitalProduct::query()->create(['workspace_id' => $workspace->id, 'user_id' => $creator->id, 'title' => 'Quota race', 'price_cents' => 100, 'currency' => 'ETB', 'type' => 'digital', 'status' => 'approved']);
    $orders = [];
    $processes = [];
    $program = <<<'CHILD'
$input = json_decode(fgets(STDIN), true, 512, JSON_THROW_ON_ERROR);
require $input['base'].'/vendor/autoload.php';
$app = require $input['base'].'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
config(['database.default' => 'quota_test', 'database.connections.quota_test' => $input['connection']]);
if (!str_contains(config('database.connections.quota_test.database'), 'test')) { exit(12); }
fwrite(STDOUT, "ready\n");
fflush(STDOUT);
fgets(STDIN);
try {
    $order = App\Storefront\Models\StorefrontOrder::findOrFail($input['order']);
    app(App\Storefront\Services\CreatorVerificationAllowance::class)->reserve($order, 1);
    exit(0);
} catch (Illuminate\Validation\ValidationException) {
    exit(10);
} catch (Throwable $exception) {
    fwrite(STDERR, get_class($exception));
    exit(11);
}
CHILD;
    try {
        for ($i = 0; $i < 2; $i++) {
            $order = StorefrontOrder::query()->create(['uuid' => (string) Str::uuid(), 'digital_product_id' => $product->id, 'creator_id' => $creator->id, 'currency' => 'ETB', 'gross_amount_cents' => 100, 'commission_bps' => 0, 'platform_fee_cents' => 0, 'creator_earnings_cents' => 100, 'status' => 'pending_payment', 'payment_gateway' => 'verify_et']);
            $orders[] = $order->id;
            $process = proc_open([PHP_BINARY, '-r', $program], [['pipe', 'r'], ['pipe', 'w'], ['pipe', 'w']], $pipes, base_path());
            expect(is_resource($process))->toBeTrue();
            fwrite($pipes[0], json_encode(['base' => base_path(), 'connection' => $connection, 'order' => $order->id], JSON_THROW_ON_ERROR)."\n");
            fflush($pipes[0]);
            $processes[] = [$process, $pipes];
        }
        foreach ($processes as [, $pipes]) {
            stream_set_timeout($pipes[1], 20);
            expect(trim((string) fgets($pipes[1])))->toBe('ready');
        }
        foreach ($processes as [, $pipes]) {
            fwrite($pipes[0], "go\n");
            fclose($pipes[0]);
        }
        $codes = [];
        foreach ($processes as [$process, $pipes]) {
            stream_get_contents($pipes[1]);
            $error = stream_get_contents($pipes[2]);
            fclose($pipes[1]);
            fclose($pipes[2]);
            $codes[] = proc_close($process);
            expect($error)->toBe('');
        }
        $processes = [];
        sort($codes);
        expect($codes)->toBe([0, 10]);
        expect(DB::table('creator_verification_allowances')->where('creator_id', $creator->id)->count())->toBe(1);
    } finally {
        foreach ($processes as [$process, $pipes]) {
            foreach ($pipes as $pipe) { if (is_resource($pipe)) { fclose($pipe); } }
            if (is_resource($process)) { proc_terminate($process); proc_close($process); }
        }
        DB::table('creator_verification_allowances')->where('creator_id', $creator->id)->delete();
        StorefrontOrder::query()->whereIn('id', $orders)->delete();
        $product->forceDelete();
        $workspace->delete();
        $creator->delete();
    }
});
