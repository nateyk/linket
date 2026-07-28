<?php

namespace App\Demo\Console;

use App\Models\User;
use Common\Auth\Actions\CreateUser;
use Common\Billing\Models\Price;
use Common\Billing\Models\Product;
use Common\Permissions\Models\Permission;
use Common\Permissions\Traits\SyncsPermissions;
use Common\Core\Install\UpdateActions;
use Common\Roles\Models\Role;
use Common\Settings\Settings;
use Illuminate\Console\Command;
use Illuminate\Console\ConfirmableTrait;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schema;

class ResetDemoSite extends Command
{
    use SyncsPermissions, ConfirmableTrait;

    protected $signature = 'demoSite:reset {--force : Force the operation to run when in production.} {--reset-products : Reset products and plans.}';

    protected $productCache = [];

    public function handle()
    {
        if (!$this->confirmToProceed()) {
            return;
        }

        if (
            !$this->option('reset-products') &&
            Schema::hasTable('products') &&
            Schema::hasTable('prices')
        ) {
            $this->productCache['products'] = Product::query()
                ->get()
                ->map(fn(Product $product) => $product->getAttributes())
                ->all();
            $this->productCache['plans'] = Price::query()
                ->get()
                ->map(fn(Price $price) => $price->getAttributes())
                ->all();
        }

        Artisan::call('optimize:clear');
        Artisan::call('down');

        @ini_set('memory_limit', '-1');
        @set_time_limit(0);

        $originalScoutDriver = config('scout.driver');
        config()->set('scout.driver', 'null');

        $originalCacheDriver = config('cache.default');
        config()->set('cache.default', 'null');

        // re-create database
        Schema::dropAllTables();

        (new UpdateActions())->execute();

        // update demo settings
        app(Settings::class)->save([
            'billing.enable' => true,
            'billing.paypal.enable' => true,
            'billing.stripe.enable' => true,
            'homepage.type' => 'landingPage',
            'i18n.enable' => false,
            'social.google.enable' => true,
        ]);

        $this->createAdminAccount();

        // restore products and plans
        if (!empty($this->productCache)) {
            Product::query()->insert($this->productCache['products']);
            Price::query()->insert($this->productCache['plans']);
        }

        // seed belink demo data
        Artisan::call(SeedDemoData::class);

        config()->set('cache.default', $originalCacheDriver);
        config()->set('scout.driver', $originalScoutDriver);

        Artisan::call('up');

        if (config('app.env') === 'production') {
            Artisan::call('optimize');
        }

        Artisan::call('cache:clear');

        $this->info('Demo site reset successfully');
    }

    private function createAdminAccount(): User
    {
        $adminPermission = Permission::query()->where('name', 'admin')->first();
        $usersRole = Role::query()->where('default', true)->first();

        $resourcePermissions = Permission::query()
            ->whereIn('name', [
                'links.create',
                'qr_codes.create',
                'folders.create',
                'biolinks.create',
                'link_overlays.create',
                'link_pages.create',
                'custom_domains.create',
                'tracking_pixels.create',
            ])
            ->get();

        $resourcePermissions = $resourcePermissions->map(function (
            Permission $permission,
        ) {
            switch ($permission['name']) {
                case 'links.create':
                    $permission['restrictions'] = [
                        ['name' => 'count', 'value' => 500],
                        ['name' => 'click_count', 'value' => 20000],
                    ];
                    break;
                default:
                    $permission['restrictions'] = [
                        ['name' => 'count', 'value' => 100],
                    ];
            }
            return $permission;
        });

        $admin = (new CreateUser())->execute([
            'name' => 'Demo Admin',
            'email' => 'admin@admin.com',
            'password' => 'admin',
            'email_verified_at' => now(),
            'permissions' => $resourcePermissions->push($adminPermission),
            'roles' => [$usersRole->id],
        ]);

        // customer
        (new CreateUser())->execute([
            'email' => 'user@user.com',
            'password' => 'password',
            'email_verified_at' => now(),
            'permissions' => $resourcePermissions->push($adminPermission),
            'roles' => [$usersRole->id],
        ]);

        // super admin
        if (config('app.demo_email') && config('app.demo_password')) {
            (new CreateUser())->execute([
                'email' => config('app.demo_email'),
                'password' => config('app.demo_password'),
                'email_verified_at' => now(),
                'permissions' => $resourcePermissions->push($adminPermission),
                'roles' => [$usersRole->id],
            ]);
        }

        return $admin;
    }
}
