<?php

namespace App\Console\Commands;

use App\CreatorAi\Services\CreatorAiSettings;
use App\CreatorAi\Writing\CreatorProductCopyDraftService;
use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\Models\Workspace;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use ReflectionMethod;

/**
 * Deliberately unavailable outside an explicitly selected, disposable MySQL
 * database. This creates browser fixtures without ever calling a live AI API.
 */
final class PrepareCreatorAiCopyE2eCommand extends Command
{
    protected $signature = 'linket:prepare-ai-copy-e2e
        {--cleanup : Delete only fixture resources recorded by the last run}
        {--write=storage/app/e2e/ai-copy-fixture.json : Local-only fixture path}';

    protected $description = 'Prepare or remove synthetic authenticated AI draft browser fixtures in an isolated test database';

    public function handle(): int
    {
        $database = (string) DB::connection()->getDatabaseName();
        $expected = getenv('LINKET_AI_COPY_E2E_DB');
        $urlHost = (string) parse_url((string) config('app.url'), PHP_URL_HOST);
        if (! app()->environment('testing')
            || getenv('LINKET_ISOLATED_E2E') !== '1'
            || ! is_string($expected)
            || ! str_contains($expected, 'test')
            || $expected !== $database
            || ! in_array($urlHost, ['127.0.0.1', 'localhost'], true)
            || DB::connection()->getDriverName() !== 'mysql') {
            $this->error('Refusing: explicitly selected test MySQL DB, testing environment, isolated flag and loopback APP_URL required.');

            return self::FAILURE;
        }

        $file = base_path((string) $this->option('write'));
        if ($this->option('cleanup')) {
            return $this->cleanup($file, $database);
        }
        if (is_file($file)) {
            $this->error('Existing fixture file must be explicitly cleaned up before reseeding.');

            return self::FAILURE;
        }

        $suffix = Str::lower(Str::random(12));
        $password = Str::random(28).'9!';
        $otherPassword = Str::random(28).'9!';
        $fixture = DB::transaction(function () use ($database, $suffix, $password, $otherPassword): array {
            $creator = $this->creator('e2e-ai-copy-'.$suffix.'@example.test', 'E2E AI Copy Creator', $password);
            $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
            $other = $this->creator('e2e-ai-copy-other-'.$suffix.'@example.test', 'E2E AI Other Creator', $otherPassword);
            $otherWorkspace = (new CreateWorkspace())->createPersonalWorkspace($other);

            // Synthetic policy is saved only in this dedicated throwaway test DB.
            // A real generation request is forbidden by the browser test.
            app(CreatorAiSettings::class)->update([
                'enabled' => true,
                'provider' => 'openai',
                'api_key' => 'sk-synthetic-no-network-e2e',
                'free_monthly_limit' => 10,
                'pro_monthly_limit' => 100,
                'provider_monthly_budget_microusd' => 3000000,
                'per_request_reservation_microusd' => 100000,
            ]);
            $result = [
                'database' => $database,
                'creator_email' => $creator->email,
                'creator_password' => $password,
                'other_email' => $other->email,
                'other_password' => $otherPassword,
                'creator_id' => $creator->id,
                'creator_workspace_id' => $workspace->id,
                'other_id' => $other->id,
                'other_workspace_id' => $otherWorkspace->id,
                'products' => [],
            ];
            foreach (['apply', 'discard'] as $scenario) {
                $product = DigitalProduct::query()->create([
                    'user_id' => $creator->id,
                    'workspace_id' => $workspace->id,
                    'title' => 'E2E private AI '.$scenario.' worksheet',
                    'description' => 'Original product copy for '.$scenario.'.',
                    'price_cents' => 12000,
                    'currency' => 'ETB',
                    'status' => 'draft',
                    'type' => 'digital',
                ]);
                $fingerprint = (new ReflectionMethod(CreatorProductCopyDraftService::class, 'fingerprint'))
                    ->invoke(app(CreatorProductCopyDraftService::class), $product->fresh());
                $id = (string) Str::uuid();
                DB::table('creator_ai_copy_drafts')->insert([
                    'id' => $id,
                    'creator_id' => $creator->id,
                    'workspace_id' => $workspace->id,
                    'digital_product_id' => $product->id,
                    'source_fingerprint' => $fingerprint,
                    'state' => 'proposed',
                    'version' => 0,
                    'encrypted_content' => Crypt::encryptString(json_encode([
                        'title' => 'Private '.$scenario.' recommendation',
                        'description' => 'Suggested '.$scenario.' printable exercises.',
                        'generated_description' => 'Suggested '.$scenario.' printable exercises.',
                    ], JSON_THROW_ON_ERROR)),
                    'expires_at' => now()->addDay(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $result['products'][$scenario] = [
                    'id' => $product->id,
                    'draft_id' => $id,
                    'original_description' => $product->description,
                ];
            }

            return $result;
        });

        if (! is_dir(dirname($file))) {
            mkdir(dirname($file), 0700, true);
        }
        file_put_contents($file, json_encode($fixture, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR)."\n");
        chmod($file, 0600);
        $this->info('Synthetic AI copy browser fixtures prepared in '.$database.'; no provider contacted.');

        return self::SUCCESS;
    }

    private function creator(string $email, string $name, string $password): User
    {
        return User::query()->create([
            'name' => $name,
            'username' => 'e2e-ai-'.Str::lower(Str::random(18)),
            'email' => $email,
            'password' => Hash::make($password),
            'email_verified_at' => now(),
        ]);
    }

    private function cleanup(string $file, string $database): int
    {
        if (! is_file($file)) {
            $this->info('No AI copy fixture to clean up.');

            return self::SUCCESS;
        }
        $fixture = json_decode((string) file_get_contents($file), true, 512, JSON_THROW_ON_ERROR);
        if (($fixture['database'] ?? null) !== $database
            || ! str_ends_with((string) ($fixture['creator_email'] ?? ''), '@example.test')
            || ! str_starts_with((string) ($fixture['creator_email'] ?? ''), 'e2e-ai-copy-')) {
            $this->error('Fixture identity does not match this isolated database.');

            return self::FAILURE;
        }
        DB::transaction(function () use ($fixture): void {
            foreach (($fixture['products'] ?? []) as $record) {
                DB::table('creator_ai_copy_drafts')->where('id', $record['draft_id'])->delete();
                DigitalProduct::query()->whereKey($record['id'])->forceDelete();
            }
            foreach (['creator', 'other'] as $which) {
                $id = (int) ($fixture[$which.'_id'] ?? 0);
                $workspace = (int) ($fixture[$which.'_workspace_id'] ?? 0);
                DB::table('workspace_user')->where('workspace_id', $workspace)->where('user_id', $id)->delete();
                Workspace::query()->whereKey($workspace)->delete();
                User::query()->whereKey($id)->forceDelete();
            }
            app(CreatorAiSettings::class)->update(['enabled' => false]);
        });
        unlink($file);
        $this->info('Synthetic AI copy browser fixtures removed.');

        return self::SUCCESS;
    }
}
