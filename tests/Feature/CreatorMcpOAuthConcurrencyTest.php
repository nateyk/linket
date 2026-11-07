<?php

use App\Models\User;
use App\Payments\Models\DirectPaymentVerification;
use App\Payments\Models\ProSubscriptionPayment;
use Common\Billing\Subscription;
use Illuminate\Cookie\CookieValuePrefix;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Tests\Support\InteractsWithCreatorMcpOAuth;

uses(InteractsWithCreatorMcpOAuth::class);

/**
 * These fixtures must be committed so independent MySQL sessions can see them.
 * No DatabaseTransactions or RefreshDatabase transaction may wrap these tests.
 */
beforeEach(function () {
    expect(config('database.connections.'.config('database.default').'.database'))->toContain('test');
    expect(DB::transactionLevel())->toBe(0);
    if (DB::getDriverName() !== 'mysql' || ! function_exists('proc_open')) {
        $this->markTestSkipped('Real OAuth races require MySQL and proc_open.');
    }
});

afterEach(function () {
    foreach ($this->mcpFixtureCreators as $creatorId) {
        $tokens = DB::table('oauth_access_tokens')->where('user_id', $creatorId)->pluck('id');
        DB::table('oauth_refresh_tokens')->whereIn('access_token_id', $tokens)->delete();
        DB::table('oauth_access_tokens')->where('user_id', $creatorId)->delete();
        DB::table('oauth_auth_codes')->where('user_id', $creatorId)->delete();
        DB::table('oauth_clients')->whereIn('id', $this->mcpFixtureClients)->delete();
        $payments = ProSubscriptionPayment::query()->where('creator_id', $creatorId)->pluck('id');
        DirectPaymentVerification::query()->where('payable_type', ProSubscriptionPayment::class)->whereIn('payable_id', $payments)->delete();
        ProSubscriptionPayment::query()->where('creator_id', $creatorId)->delete();
        Subscription::query()->where('user_id', $creatorId)->delete();
        DB::table('workspace_user')->where('user_id', $creatorId)->delete();
        DB::table('workspaces')->where('owner_id', $creatorId)->delete();
        User::query()->whereKey($creatorId)->delete();
    }
});

/**
 * @param list<array<string,mixed>> $operations
 * @return list<array{status:int,body?:array<string,mixed>|null}>
 */
function raceMcpOAuth(array $operations, string $lockedTable, string $lockedId): array
{
    $processes = [];
    $config = [
        'creator_ai' => config('creator_ai'), 'passport.private_key' => config('passport.private_key'),
        'passport.public_key' => config('passport.public_key'), 'app.url' => config('app.url'),
        'session.driver' => config('session.driver'), 'session.block_store' => 'file',
        'session.files' => config('session.files'), 'cache.default' => 'array',
    ];
    DB::beginTransaction();
    try {
        DB::table($lockedTable)->where('id', $lockedId)->lockForUpdate()->firstOrFail();
        foreach ($operations as $operation) {
            $process = proc_open([PHP_BINARY, base_path('tests/Support/creator-mcp-oauth-worker.php')], [['pipe', 'r'], ['pipe', 'w'], ['pipe', 'w']], $pipes, base_path());
            expect(is_resource($process))->toBeTrue();
            $processes[] = [$process, $pipes];
            stream_set_timeout($pipes[1], 15);
            fwrite($pipes[0], json_encode(['config' => $config, ...$operation], JSON_THROW_ON_ERROR)."\n");
            fflush($pipes[0]);
        }
        $connectionIds = [];
        foreach ($processes as [, $pipes]) {
            expect((string) fgets($pipes[1]))->toStartWith('Batch 0 guard:');
            $ready = json_decode((string) fgets($pipes[1]), true, 512, JSON_THROW_ON_ERROR);
            $connectionIds[] = $ready['ready'];
        }
        expect(count(array_unique($connectionIds)))->toBe(count($operations));
        expect($connectionIds)->not->toContain(DB::selectOne('SELECT CONNECTION_ID() AS id')->id);
        if ($operations[0]['operation'] === 'approval') {
            // First approval has consumed the nonce and holds the session
            // lock while waiting on our user-row lock. The second must
            // actually contend on that session lock before we release it.
            fwrite($processes[0][1][0], "go\n");
            fflush($processes[0][1][0]);
            expect(trim((string) fgets($processes[0][1][1])))->toBe('attempting');
            fwrite($processes[1][1][0], "go\n");
            fflush($processes[1][1][0]);
            expect(trim((string) fgets($processes[1][1][1])))->toBe('blocked');
            foreach ($processes as [, $pipes]) {
                fclose($pipes[0]);
            }
        } else {
            foreach ($processes as [, $pipes]) {
                fwrite($pipes[0], "go\n");
                fclose($pipes[0]);
            }
            foreach ($processes as [, $pipes]) {
                expect(trim((string) fgets($pipes[1])))->toBe('attempting');
            }
        }
        DB::commit();
        $results = [];
        foreach ($processes as [$process, $pipes]) {
            $result = (string) fgets($pipes[1]);
            $error = stream_get_contents($pipes[2]);
            fclose($pipes[1]);
            fclose($pipes[2]);
            expect(proc_close($process))->toBe(0);
            expect($error)->toBe('');
            $results[] = json_decode($result, true, 512, JSON_THROW_ON_ERROR);
        }
        $processes = [];

        return $results;
    } finally {
        if (DB::transactionLevel() > 0) {
            DB::rollBack();
        }
        foreach ($processes as [$process, $pipes]) {
            if (is_resource($process)) {
                proc_terminate($process);
            }
            foreach ($pipes as $pipe) {
                if (is_resource($pipe)) {
                    fclose($pipe);
                }
            }
            if (is_resource($process)) {
                proc_close($process);
            }
        }
    }
}

test('separate MySQL connections redeem a code or rotate a refresh token only once', function (string $grant) {
    $this->enableMcpOAuth();
    [$creator, $workspace, $parameters] = $this->mcpCreator();
    $code = $this->mcpConsent($creator, $workspace, $parameters);
    $form = [
        'grant_type' => 'authorization_code', 'code' => $code, 'code_verifier' => str_repeat('x', 43),
        'client_id' => $parameters['client_id'], 'redirect_uri' => $parameters['redirect_uri'], 'resource' => $parameters['resource'],
    ];
    $table = 'creator_ai_mcp_oauth_code_bindings';
    $lockedTable = 'oauth_auth_codes';
    $id = DB::table($table)->where('creator_id', $creator->id)->value('auth_code_id');
    if ($grant === 'refresh_token') {
        $tokens = $this->mcpRedeem($code, $parameters)->assertOk()->json();
        $form = ['grant_type' => $grant, 'refresh_token' => $tokens['refresh_token'], 'client_id' => $parameters['client_id'], 'resource' => $parameters['resource']];
        $lockedTable = 'oauth_refresh_tokens';
        $id = DB::table($lockedTable)->whereIn('access_token_id', DB::table('oauth_access_tokens')->where('user_id', $creator->id)->select('id'))->value('id');
    }
    $operation = ['operation' => 'token', 'path' => 'oauth/linket/token', 'form' => $form];

    $results = raceMcpOAuth([$operation, $operation], $lockedTable, $id);

    expect(array_column($results, 'status'))->toEqualCanonicalizing([200, 400]);
    $success = collect($results)->firstWhere('status', 200)['body'];
    $this->mcpCall($success['access_token'])->assertOk();
    expect(DB::table('oauth_access_tokens')->where('user_id', $creator->id)->where('revoked', false)->count())->toBe(1);
    expect(DB::table('oauth_refresh_tokens')->whereIn('access_token_id', DB::table('oauth_access_tokens')->where('user_id', $creator->id)->select('id'))->where('revoked', false)->count())->toBe(1);
    expect(DB::table('oauth_access_tokens')->where('user_id', $creator->id)->count())->toBe($grant === 'refresh_token' ? 2 : 1);
    expect(DB::table('creator_ai_mcp_oauth_token_bindings')->where('creator_id', $creator->id)->count())->toBe($grant === 'refresh_token' ? 2 : 1);
    $this->mcpRefresh($success['refresh_token'], $parameters)->assertOk();
})->with(['authorization_code', 'refresh_token']);

test('disconnect racing a real refresh leaves no usable token or orphan successor', function () {
    $this->enableMcpOAuth();
    [$creator, $workspace, $parameters] = $this->mcpCreator();
    $tokens = $this->mcpRedeem($this->mcpConsent($creator, $workspace, $parameters), $parameters)->assertOk()->json();
    $connectionId = DB::table('creator_ai_mcp_connections')->where('creator_id', $creator->id)->value('id');
    $operations = [
        ['operation' => 'disconnect', 'creator' => $creator->id, 'connection' => $connectionId],
        ['operation' => 'token', 'path' => 'oauth/linket/token', 'form' => ['grant_type' => 'refresh_token', 'refresh_token' => $tokens['refresh_token'], 'client_id' => $parameters['client_id'], 'resource' => $parameters['resource']]],
    ];

    $results = raceMcpOAuth($operations, 'users', (string) $creator->id);

    expect($results[0]['status'])->toBe(204);
    expect($results[1]['status'])->toBeIn([200, 400]);
    expect(DB::table('creator_ai_mcp_connections')->where('id', $connectionId)->value('status'))->toBe('revoked');
    $access = DB::table('oauth_access_tokens')->where('user_id', $creator->id);
    expect((clone $access)->where('revoked', false)->count())->toBe(0);
    expect(DB::table('oauth_refresh_tokens')->whereIn('access_token_id', (clone $access)->select('id'))->where('revoked', false)->count())->toBe(0);
    expect(DB::table('creator_ai_mcp_oauth_token_bindings')->where('creator_id', $creator->id)->count())->toBe($access->count());
    $this->mcpCall($tokens['access_token'])->assertUnauthorized();
    $this->mcpRefresh($tokens['refresh_token'], $parameters)->assertBadRequest();
    if ($results[1]['status'] === 200) {
        $this->mcpCall($results[1]['body']['access_token'])->assertUnauthorized();
        $this->mcpRefresh($results[1]['body']['refresh_token'], $parameters)->assertBadRequest();
    }
});

test('parallel HTTP approvals of one file session nonce issue exactly one authorization code', function () {
    $this->enableMcpOAuth();
    config()->set('session.driver', 'file');
    config()->set('session.block_store', 'file');
    [$creator, $workspace, $parameters] = $this->mcpCreator();
    $credentials = $this->mcpBeginConsent($creator, $parameters);
    $session = app('session')->driver();
    $session->put(Auth::guard('web')->getName(), $creator->id);
    $session->save();
    $cookieName = config('session.cookie');
    $cookie = encrypt(CookieValuePrefix::create($cookieName, app('encrypter')->getKey()).$session->getId(), false);
    $operation = [
        'operation' => 'approval', 'path' => 'oauth/linket/authorize/approve',
        'form' => [...$credentials, 'workspace_id' => $workspace], 'cookies' => [$cookieName => $cookie],
    ];

    try {
        $results = raceMcpOAuth([$operation, $operation], 'users', (string) $creator->id);

        expect(array_column($results, 'status'))->toEqualCanonicalizing([302, 403]);
        expect(DB::table('oauth_auth_codes')->where('user_id', $creator->id)->count())->toBe(1);
        expect(DB::table('creator_ai_mcp_oauth_code_bindings')->where('creator_id', $creator->id)->count())->toBe(1);
        expect(DB::table('creator_ai_mcp_connections')->where('creator_id', $creator->id)->count())->toBe(1);
        expect(DB::table('oauth_access_tokens')->where('user_id', $creator->id)->count())->toBe(0);
    } finally {
        $session->getHandler()->destroy($session->getId());
    }
});
