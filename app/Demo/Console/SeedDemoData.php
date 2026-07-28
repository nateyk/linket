<?php

namespace App\Demo\Console;

use App\Biolinks\Actions\AddInitialContentToBiolink;
use App\Biolinks\Models\Biolink;
use App\Links\Models\Link;
use App\Analytics\Models\TrackedEvent;
use App\Biolinks\Models\BiolinkLink;
use App\Folders\Models\Folder;
use App\LinkOverlays\Models\LinkOverlay;
use App\LinkPages\Models\LinkPage;
use App\Models\User;
use App\QrCodes\Models\QrCode;
use Common\Auth\Models\UserSession;
use Common\Billing\Models\Product;
use Common\Billing\Products\CrupdateProduct;
use Common\Billing\Subscription;
use Common\Permissions\Models\Permission;
use Common\Roles\Models\Role;
use Common\Workspaces\Models\Workspace;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SeedDemoData extends Command
{
    protected $signature = 'demo:seed';

    protected $description = 'Seed demo data.';

    protected User $user;
    protected Workspace $personalWorkspace;

    public function handle(): int
    {
        $this->user = User::query()->where('email', 'user@user.com')->first();

        $this->personalWorkspace = Workspace::query()
            ->where('owner_id', $this->user->id)
            ->where('is_personal', true)
            ->first();

        $this->generateWorkspaces();

        $this->generateFolders();

        $this->generateBiolink();

        $this->generateQrCodes();

        $this->generateTrackedEvents();

        LinkOverlay::factory()->create([
            'user_id' => $this->user->id,
            'workspace_id' => $this->personalWorkspace->id,
            'name' => 'Demo link overlay',
            'message' => 'Demo Link Overlay Message',
            'btn_text' => 'Button text',
            'label' => 'Demo',
        ]);

        LinkPage::factory()->create([
            'user_id' => $this->user->id,
            'workspace_id' => $this->personalWorkspace->id,
            'title' => 'Demo link page',
        ]);

        $this->generateUsersAndSubscriptions();

        try {
            if (Product::query()->count() === 0) {
                $this->generateBasicPlan();
                $this->generateStandardPlan();
                $this->generateProPlan();
            }
        } catch (\Exception $e) {
            report($e);
        }

        return Command::SUCCESS;
    }

    protected function generateWorkspaces()
    {
        $this->info('Generating workspaces.');

        DB::beginTransaction();

        $workspaces = Workspace::factory()
            ->count(2)
            ->create([
                'owner_id' => $this->user->id,
            ]);

        foreach ($workspaces as $workspace) {
            $workspace->members()->create([
                'user_id' => $this->user->id,
                'role_id' => 1,
                'is_owner' => true,
            ]);

            Link::factory()
                ->count(random_int(8, 20))
                ->create([
                    'type' => 'direct',
                    'user_id' => $this->user->id,
                    'workspace_id' => $workspace->id,
                ]);
        }

        DB::commit();
    }

    protected function generateFolders()
    {
        $this->info('Generating folders.');

        DB::beginTransaction();

        $folders = Folder::factory()
            ->count(3)
            ->create([
                'user_id' => $this->user->id,
                'workspace_id' => $this->personalWorkspace->id,
            ]);

        foreach ($folders as $folder) {
            QrCode::query()->create([
                'back_half' => Str::random(10),
                'linkeable_id' => $folder->id,
                'linkeable_type' => Folder::MODEL_TYPE,
                'user_id' => $this->user->id,
                'workspace_id' => $folder->workspace_id,
            ]);

            $folderLinks = Link::factory()
                ->count(random_int(8, 20))
                ->create([
                    'type' => 'direct',
                    'user_id' => $this->user->id,
                    'workspace_id' => $folder->workspace_id,
                    'folder_id' => $folder->id,
                ]);

            $folder->update([
                'clicks_count' => $folderLinks->sum('clicks_count'),
            ]);
        }

        DB::commit();
    }

    protected function generateBiolink()
    {
        $this->info('Generating biolinks.');

        DB::beginTransaction();

        $biolink = Biolink::factory()->create([
            'name' => 'Landing page',
            'user_id' => $this->user->id,
            'workspace_id' => $this->personalWorkspace->id,
        ]);

        $biolink->appearance()->create([
            'config' => [
                'bgConfig' => [
                    'activeType' => 'image',
                    'backgroundPosition' => 'center center',
                    'backgroundRepeat' => 'no-repeat',
                    'backgroundSize' => 'cover',
                    'backgroundImage' =>
                        'url(images/wallpapers/apple/lake-the-lake-day-iphone.webp)',
                    'color' => '#ffffff',
                    'tint' => 20,
                ],
                'btnConfig' => [
                    'variant' => 'glass',
                    'radius' => 'rounded-full',
                    'textColor' => '#ffffff',
                ],
            ],
        ]);

        $biolinkLinks = collect();

        $links = [
            [
                'url' => 'https://spotify.com',
                'name' => 'Spotify',
            ],
            [
                'url' => 'https://deezer.com',
                'name' => 'Deezer',
            ],
            [
                'url' => 'https://soundcloud.com',
                'name' => 'SoundCloud',
            ],
            [
                'url' => 'https://tidal.com',
                'name' => 'Tidal',
            ],
        ];

        foreach ($links as $link) {
            $biolinkLinks[] = BiolinkLink::factory()->create([
                'long_url' => $link['url'],
                'name' => $link['name'],
                'type' => 'direct',
                'user_id' => $this->user->id,
                'workspace_id' => $biolink->workspace_id,
            ]);
        }

        $biolink->links()->sync(
            $biolinkLinks->mapWithKeys(
                fn($link, $index) => [
                    $link->id => ['position' => $index + 2, 'active' => true],
                ],
            ),
        );

        (new AddInitialContentToBiolink())->execute(
            $biolink->id,
            $this->user,
            $biolinkLinks->count(),
        );

        DB::commit();
    }

    protected function generateQrCodes()
    {
        $this->info('Generating qr codes.');

        DB::beginTransaction();

        // qr codes for links
        $links = Link::query()->limit(50)->get();

        $links->map(function (Link $link) {
            return QrCode::factory()->create([
                'linkeable_id' => $link->id,
                'linkeable_type' => Link::MODEL_TYPE,
                'user_id' => $this->user->id,
                'workspace_id' => $link->workspace_id,
                'created_at' => $link->created_at,
            ]);
        });

        // qr codes without linkeable
        QrCode::factory()
            ->count(5)
            ->create([
                'user_id' => $this->user->id,
                'workspace_id' => $this->personalWorkspace->id,
            ]);

        DB::commit();
    }

    protected function generateTrackedEvents()
    {
        DB::beginTransaction();

        // links
        $links = Link::query()->limit(500)->get();
        foreach ($links as $link) {
            TrackedEvent::factory()
                ->count($link->clicks_count)
                ->create([
                    'linkeable_id' => $link->id,
                    'linkeable_type' => Link::MODEL_TYPE,
                    'user_id' => $this->user->id,
                    'workspace_id' => $link->workspace_id,
                ]);
        }

        // biolinks
        $biolinks = Biolink::query()->limit(50)->get();
        foreach ($biolinks as $biolink) {
            TrackedEvent::factory()
                ->count($biolink->clicks_count)
                ->create([
                    'linkeable_id' => $biolink->id,
                    'linkeable_type' => Biolink::MODEL_TYPE,
                    'user_id' => $this->user->id,
                    'workspace_id' => $biolink->workspace_id,
                ]);
        }

        // scanes for qr codes
        $qrCodes = QrCode::query()->limit(500)->get();
        foreach ($qrCodes as $qrCode) {
            TrackedEvent::factory()
                ->count($qrCode->scans_count)
                ->create([
                    'event_type' => 'scan',
                    'linkeable_id' => $qrCode->id,
                    'linkeable_type' => QrCode::MODEL_TYPE,
                ]);
        }

        DB::commit();
    }

    protected function generateUsersAndSubscriptions()
    {
        $this->info('Generating users.');

        DB::beginTransaction();

        $usersRole = Role::query()->where('default', true)->first();
        $users = User::factory()
            ->count(25)
            ->has(UserSession::factory())
            ->create();
        DB::table('user_role')->insert(
            $users
                ->map(
                    fn($user) => [
                        'user_id' => $user->id,
                        'role_id' => $usersRole->id,
                    ],
                )
                ->toArray(),
        );

        $bannedUsers = $users->random(3);
        foreach ($bannedUsers as $user) {
            $user->createBan([
                'comment' => 'Demo banned user',
                'permanent' => false,
                'created_by_id' => $this->user->id,
                'ban_until' => now()->addDays(30),
            ]);
        }

        Subscription::factory()
            ->active()
            ->create([
                'user_id' => $users[0]->id,
            ]);
        Subscription::factory()
            ->incomplete()
            ->create([
                'user_id' => $users[1]->id,
            ]);
        Subscription::factory()
            ->trialing()
            ->create([
                'user_id' => $users[2]->id,
            ]);
        Subscription::factory()
            ->active()
            ->create([
                'user_id' => $users[3]->id,
            ]);
        Subscription::factory()
            ->active()
            ->create([
                'user_id' => $users[4]->id,
            ]);

        DB::commit();
    }

    protected function generateBasicPlan()
    {
        [$featureList, $permissions] = $this->getPlanFeaturesAndPermission([
            'visitors' => 1000,
            'links' => 50,
            'biolinks' => 1,
            'qr_codes' => 50,
            'folders' => 10,
            'pages' => 10,
            'overlays' => 10,
            'pixels' => 10,
        ]);

        (new CrupdateProduct())->execute(
            [
                'name' => 'Basic',
                'position' => 1,
                'feature_list' => $featureList,
                'permissions' => $permissions,
                'prices' => [
                    [
                        'amount' => 10,
                        'currency' => 'USD',
                        'interval' => 'month',
                        'interval_count' => 1,
                    ],
                    [
                        'amount' => 54,
                        'currency' => 'USD',
                        'interval' => 'month',
                        'interval_count' => 6,
                    ],
                    [
                        'amount' => 96,
                        'currency' => 'USD',
                        'interval' => 'month',
                        'interval_count' => 12,
                    ],
                ],
            ],
            syncProduct: true,
        );
    }

    protected function generateStandardPlan()
    {
        [$featureList, $permissions] = $this->getPlanFeaturesAndPermission([
            'visitors' => 3000,
            'links' => 150,
            'biolinks' => 1,
            'qr_codes' => 150,
            'folders' => 30,
            'pages' => 30,
            'overlays' => 30,
            'pixels' => 30,
        ]);
        (new CrupdateProduct())->execute(
            [
                'name' => 'Standard',
                'position' => 2,
                'feature_list' => $featureList,
                'permissions' => $permissions,
                'recommended' => true,
                'prices' => [
                    [
                        'amount' => 15,
                        'currency' => 'USD',
                        'interval' => 'month',
                        'interval_count' => 1,
                    ],
                    [
                        'amount' => 81,
                        'currency' => 'USD',
                        'interval' => 'month',
                        'interval_count' => 6,
                    ],
                    [
                        'amount' => 144,
                        'currency' => 'USD',
                        'interval' => 'month',
                        'interval_count' => 12,
                    ],
                ],
            ],
            syncProduct: true,
        );
    }

    protected function generateProPlan()
    {
        [$featureList, $permissions] = $this->getPlanFeaturesAndPermission([]);
        (new CrupdateProduct())->execute(
            [
                'name' => 'Pro',
                'position' => 3,
                'feature_list' => $featureList,
                'permissions' => $permissions,
                'prices' => [
                    [
                        'amount' => 20,
                        'currency' => 'USD',
                        'interval' => 'month',
                        'interval_count' => 1,
                    ],
                    [
                        'amount' => 135,
                        'currency' => 'USD',
                        'interval' => 'month',
                        'interval_count' => 6,
                    ],
                    [
                        'amount' => 240,
                        'currency' => 'USD',
                        'interval' => 'month',
                        'interval_count' => 12,
                    ],
                ],
            ],
            syncProduct: true,
        );
    }

    protected function getPlanFeaturesAndPermission(array $params): array
    {
        $permissionIds = Permission::query()->pluck('id', 'name');
        $featureList = [
            isset($params['visitors'])
                ? "Up to {$params['visitors']} visitors / month"
                : 'Unlimited visitors / month',
            isset($params['links'])
                ? "Up to {$params['links']} links"
                : 'Unlimited links',
            isset($params['biolinks'])
                ? 'Create a link in bio'
                : 'Create multiple links in bio',
            isset($params['qr_codes'])
                ? "Up to {$params['qr_codes']} QR codes"
                : 'Unlimited QR codes',
            isset($params['pages'])
                ? "Up to {$params['pages']} custom link pages"
                : 'Unlimited link pages',
            isset($params['folders'])
                ? "Up to {$params['folders']} folders"
                : 'Unlimited folders',
            isset($params['overlays'])
                ? "Up to {$params['overlays']} link overlays"
                : 'Unlimited link overlays',
            isset($params['pixels'])
                ? "Up to {$params['pixels']} tracking pixels"
                : 'Unlimited tracking pixels',
        ];

        $permissions = [];

        $permissions[] = [
            'id' => $permissionIds['links.create'],
            'restrictions' => [
                ['name' => 'count', 'value' => $params['links'] ?? null],
                [
                    'name' => 'click_count',
                    'value' => $params['visitors'] ?? null,
                ],
            ],
        ];

        $permissions[] = [
            'id' => $permissionIds['qr_codes.create'],
            'restrictions' => [
                ['name' => 'count', 'value' => $params['qr_codes'] ?? null],
            ],
        ];

        $permissions[] = [
            'id' => $permissionIds['custom_pages.create'],
            'restrictions' => [
                ['name' => 'count', 'value' => $params['pages'] ?? null],
            ],
        ];

        $permissions[] = [
            'id' => $permissionIds['folders.create'],
            'restrictions' => [
                ['name' => 'count', 'value' => $params['folders'] ?? null],
            ],
        ];

        $permissions[] = [
            'id' => $permissionIds['link_overlays.create'],
            'restrictions' => [
                ['name' => 'count', 'value' => $params['overlays'] ?? null],
            ],
        ];

        $permissions[] = [
            'id' => $permissionIds['tracking_pixels.create'],
            'restrictions' => [
                ['name' => 'count', 'value' => $params['pixels'] ?? null],
            ],
        ];

        return [$featureList, $permissions];
    }
}
