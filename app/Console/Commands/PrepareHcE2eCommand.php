<?php

namespace App\Console\Commands;

use App\Conversations\Models\Conversation;
use App\Conversations\Models\ConversationItem;
use App\Conversations\Models\ConversationStatus;
use App\HelpCenter\Models\HcArticle;
use App\HelpCenter\Models\HcCategory;
use App\Models\User;
use Common\Billing\Models\Product;
use Common\Billing\Subscription;
use Common\Permissions\Models\Permission;
use Common\Roles\Models\Role;
use Common\Workspaces\Actions\CreateWorkspace;
use Database\Seeders\SupportAgentsRoleSeeder;
use Database\Seeders\SupportDefaultsSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class PrepareHcE2eCommand extends Command
{
    protected $signature = 'linket:prepare-hc-e2e {--write=storage/app/e2e/hc-fixture.json}';

    protected $description = 'Upsert synthetic Help Center + support fixtures into disposable db_test for Playwright';

    public function handle(): int
    {
        $database = (string) DB::connection()->getDatabaseName();
        if (! app()->environment('testing') || ! str_contains(strtolower($database), 'test')) {
            $this->error("Refusing to seed: APP_ENV must be testing and DB must be disposable (got env=".app()->environment().", db={$database}).");

            return self::FAILURE;
        }

        RateLimiter::clear('illuminate:throttle');

        $this->call('db:seed', [
            '--class' => SupportDefaultsSeeder::class,
            '--force' => true,
            '--no-interaction' => true,
        ]);
        $this->call('db:seed', [
            '--class' => SupportAgentsRoleSeeder::class,
            '--force' => true,
            '--no-interaction' => true,
        ]);
        $this->call('db:seed', [
            '--class' => \Common\Database\Seeders\RolesTableSeeder::class,
            '--force' => true,
            '--no-interaction' => true,
        ]);

        $this->ensureGuestHcPermissions();

        $fixture = DB::transaction(function (): array {
            $admin = $this->upsertUser(
                email: 'e2e-hc-admin@example.test',
                name: 'E2E HC Admin',
                password: 'E2eHcAdmin!23',
                type: 'agent',
            );
            $this->attachAgentsRole($admin);
            $this->grantPermissions($admin, [
                'articles.view',
                'articles.create',
                'articles.update',
                'articles.delete',
                'conversations.update',
                'conversations.view',
                'tickets.update',
                'admin',
            ]);

            $agent = $this->upsertUser(
                email: 'e2e-hc-agent@example.test',
                name: 'E2E HC Agent',
                password: 'E2eHcAgent!23',
                type: 'agent',
            );
            $this->attachAgentsRole($agent);
            // This fixture intentionally has content permissions, not admin access.
            $this->grantPermissions($agent, [
                'articles.view',
                'articles.create',
                'articles.update',
            ]);

            $freeCreator = $this->upsertUser(
                email: 'e2e-hc-free@example.test',
                name: 'E2E Free Creator',
                password: 'E2eHcFree!23',
            );
            $this->ensurePersonalWorkspace($freeCreator);
            $this->subscribeToPlan($freeCreator, 'free');
            $this->grantPermissions($freeCreator, [
                'conversations.create',
                'articles.view',
            ]);

            $proCreator = $this->upsertUser(
                email: 'e2e-hc-pro@example.test',
                name: 'E2E Pro Creator',
                password: 'E2eHcPro!23',
            );
            $this->ensurePersonalWorkspace($proCreator);
            $this->subscribeToPlan($proCreator, 'pro');
            $this->grantPermissions($proCreator, [
                'conversations.create',
                'articles.view',
            ]);

            $buyer = $this->upsertUser(
                email: 'e2e-hc-buyer@example.test',
                name: 'E2E HC Buyer',
                password: 'E2eHcBuyer!23',
            );
            $this->grantPermissions($buyer, ['conversations.create', 'articles.view']);

            [$category, $section, $published, $draft] = $this->seedHelpCenter($admin);

            $ticket = $this->seedOpenTicket($buyer, $admin);

            return [
                'database' => DB::connection()->getDatabaseName(),
                'admin' => [
                    'email' => $admin->email,
                    'password' => 'E2eHcAdmin!23',
                ],
                'agent' => [
                    'email' => $agent->email,
                    'password' => 'E2eHcAgent!23',
                ],
                'free_creator' => [
                    'email' => $freeCreator->email,
                    'password' => 'E2eHcFree!23',
                ],
                'pro_creator' => [
                    'email' => $proCreator->email,
                    'password' => 'E2eHcPro!23',
                ],
                'buyer' => [
                    'email' => $buyer->email,
                    'password' => 'E2eHcBuyer!23',
                ],
                'category' => [
                    'id' => $category->id,
                    'name' => $category->name,
                    'slug' => $category->slug ?? Str::slug($category->name),
                ],
                'section' => [
                    'id' => $section->id,
                    'name' => $section->name,
                ],
                'published_article' => [
                    'id' => $published->id,
                    'title' => $published->title,
                    'slug' => $published->slug,
                    'url' => "/hc/articles/{$published->id}/{$published->slug}",
                ],
                'draft_article' => [
                    'id' => $draft->id,
                    'title' => $draft->title,
                    'slug' => $draft->slug,
                    'url' => "/hc/articles/{$draft->id}/{$draft->slug}",
                ],
                'ticket' => [
                    'id' => $ticket->id,
                    'subject' => $ticket->subject,
                    'customer_url' => "/hc/tickets/{$ticket->id}",
                    'agent_url' => "/agent/conversations/{$ticket->id}",
                ],
                'routes' => [
                    'help_landing' => '/help',
                    'help_search' => '/hc/search/getting',
                    'new_ticket' => '/hc/tickets/new',
                    'admin_hc_settings' => '/admin/settings/hc',
                    'agent_hc_arrange' => '/agent/hc/arrange',
                    'admin_hc_arrange' => '/admin/help/arrange',
                    'admin_hc_articles' => '/admin/help/articles',
                    'agent_inbox' => '/agent/conversations',
                ],
            ];
        });

        $path = base_path($this->option('write'));
        if (! is_dir(dirname($path))) {
            mkdir(dirname($path), 0775, true);
        }
        file_put_contents($path, json_encode($fixture, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)."\n");

        $this->info('Wrote HC E2E fixture to '.$this->option('write').' (db='.$fixture['database'].')');

        return self::SUCCESS;
    }

    private function ensureGuestHcPermissions(): void
    {
        $guestRole = Role::query()->firstOrCreate(
            ['guests' => true],
            [
                'name' => 'Guests',
                'type' => 'users',
                'internal' => true,
                'default' => false,
            ],
        );

        foreach (['articles.view', 'conversations.create', 'files.create'] as $name) {
            $permission = Permission::query()->firstOrCreate(['name' => $name]);
            $guestRole->permissions()->syncWithoutDetaching([$permission->id]);
        }

        app()->forgetInstance('guestRole');
    }

    private function upsertUser(string $email, string $name, string $password, string $type = 'user'): User
    {
        $user = User::query()->where('email', $email)->first();
        if (! $user) {
            $user = User::query()->create([
                'name' => $name,
                'username' => Str::slug(Str::before($email, '@')).'-'.Str::lower(Str::random(4)),
                'email' => $email,
                'password' => Hash::make($password),
                'email_verified_at' => now(),
                'type' => $type,
            ]);
        } else {
            $user->forceFill([
                'name' => $name,
                'password' => Hash::make($password),
                'email_verified_at' => now(),
                'type' => $type,
            ])->save();
        }

        return $user->fresh();
    }

    private function attachAgentsRole(User $user): void
    {
        $role = Role::query()->firstOrCreate(
            ['name' => 'Agents'],
            [
                'type' => 'agents',
                'default' => false,
                'guests' => false,
                'internal' => true,
                'agents' => true,
            ],
        );
        if (isset($role->agents) && ! $role->agents) {
            $role->update(['agents' => true]);
        }
        $user->roles()->syncWithoutDetaching([$role->id]);
    }

    /**
     * @param  list<string>  $names
     */
    private function grantPermissions(User $user, array $names): void
    {
        $ids = [];
        foreach ($names as $name) {
            $ids[] = Permission::query()->firstOrCreate(['name' => $name])->id;
        }
        $user->permissions()->syncWithoutDetaching($ids);
    }

    private function ensurePersonalWorkspace(User $user): void
    {
        $exists = DB::table('workspace_user')->where('user_id', $user->id)->exists();
        if (! $exists) {
            (new CreateWorkspace())->createPersonalWorkspace($user);
        }
    }

    private function subscribeToPlan(User $user, string $systemKey): void
    {
        $product = Product::query()->where('system_key', $systemKey)->first()
            ?? ($systemKey === 'free'
                ? Product::query()->where('free', true)->orderByDesc('is_default')->first()
                : null);

        if (! $product) {
            return;
        }

        $price = $product->prices()->orderBy('id')->first();
        if (! $price) {
            return;
        }

        Subscription::query()->where('user_id', $user->id)->delete();

        Subscription::query()->create([
            'user_id' => $user->id,
            'product_id' => $product->id,
            'price_id' => $price->id,
            'gateway_name' => 'none',
            'gateway_id' => 'e2e-hc-'.$systemKey.'-'.$user->id,
            'gateway_status' => 'active',
            'renews_at' => now()->addYear(),
        ]);
    }

    /**
     * @return array{0: HcCategory, 1: HcCategory, 2: HcArticle, 3: HcArticle}
     */
    private function seedHelpCenter(User $author): array
    {
        $category = HcCategory::query()->updateOrCreate(
            ['name' => 'E2E Getting Started'],
            [
                'description' => 'Synthetic HC category for isolated E2E',
                // The default article-grid landing displays only the first
                // root. Place the synthetic fixture first in disposable DBs
                // so actual public landing journeys exercise it.
                'position' => -1,
            ],
        );

        // A second root keeps landing `hide_from_structure` from forcing the
        // only category invisible in articleGrid (BeDesk single-root quirk).
        HcCategory::query()->firstOrCreate(
            ['name' => 'E2E Secondary Root'],
            [
                'description' => 'Synthetic companion root for landing layout',
                'position' => 2,
            ],
        );

        $section = HcCategory::query()->firstOrCreate(
            [
                'name' => 'E2E Basics',
                'parent_id' => $category->id,
            ],
            [
                'description' => 'Synthetic HC section',
                'position' => 1,
            ],
        );

        $published = HcArticle::query()->updateOrCreate(
            ['slug' => 'e2e-published-getting-started'],
            [
                'title' => 'E2E Published Getting Started',
                'body' => '<h2>Welcome</h2><p>This published article is visible to guests, Free creators, Pro creators, and buyers.</p><ul><li>Browse help</li><li>Open a ticket when needed</li></ul>',
                'draft' => false,
                'author_id' => $author->id,
                'description' => 'Published article for HC E2E',
            ],
        );

        $publishedSecondary = HcArticle::query()->updateOrCreate(
            ['slug' => 'e2e-published-open-a-ticket'],
            [
                'title' => 'E2E Published Open a Ticket',
                'body' => '<p>When you need help, open a support request from the Help Center.</p>',
                'draft' => false,
                'author_id' => $author->id,
                'description' => 'Second published article so landing grids stay visible',
            ],
        );

        $draft = HcArticle::query()->updateOrCreate(
            ['slug' => 'e2e-draft-internal-only'],
            [
                'title' => 'E2E Draft Internal Only',
                'body' => '<p>This draft must stay unpublished for public users.</p>',
                'draft' => true,
                'author_id' => $author->id,
                'description' => 'Draft article for HC E2E',
            ],
        );

        foreach ([$published, $publishedSecondary, $draft] as $index => $article) {
            $article->categories()->syncWithoutDetaching([
                $section->id => ['position' => $index + 1],
                $category->id => ['position' => $index + 1],
            ]);
        }

        return [$category, $section, $published, $draft];
    }

    private function seedOpenTicket(User $buyer, User $agent): Conversation
    {
        $openStatus = ConversationStatus::findOrGetDefaultOpen(null);

        $ticket = Conversation::query()
            ->where('user_id', $buyer->id)
            ->where('subject', 'E2E HC support request')
            ->whereNull('support_owner_id')
            ->first();

        if (! $ticket) {
            $ticket = Conversation::query()->create([
                'user_id' => $buyer->id,
                'subject' => 'E2E HC support request',
                'type' => 'ticket',
                'assigned_to' => Conversation::ASSIGNED_AGENT,
                'assignee_id' => $agent->id,
                'status_id' => $openStatus->id,
                'status_category' => $openStatus->category,
                'support_owner_id' => null,
            ]);
        } else {
            $ticket->forceFill([
                'assignee_id' => $agent->id,
                'status_id' => $openStatus->id,
                'status_category' => $openStatus->category,
            ])->save();
        }

        if (! $ticket->items()->where('type', 'message')->exists()) {
            ConversationItem::query()->create([
                'conversation_id' => $ticket->id,
                'user_id' => $buyer->id,
                'type' => 'message',
                'body' => '<p>Synthetic buyer needs help with a purchase question.</p>',
            ]);

            ConversationItem::query()->create([
                'conversation_id' => $ticket->id,
                'user_id' => $agent->id,
                'type' => ConversationItem::NOTE_TYPE,
                'body' => '<p>Private staff note — do not show to customer.</p>',
            ]);

            ConversationItem::query()->create([
                'conversation_id' => $ticket->id,
                'user_id' => $agent->id,
                'type' => 'message',
                'body' => '<p>Thanks — we are reviewing your request.</p>',
            ]);
        }

        return $ticket->fresh();
    }
}
