<?php

namespace App\Providers;

use App\Actions\AppBootstrapData;
use App\Demo\Console\ResetDemoSite;
use App\Demo\Console\SeedDemoData;
use App\Biolinks\Actions\CrupdateBiolink;
use App\Biolinks\Console\DisableExpiredLeapLinks;
use App\Biolinks\Models\Biolink;
use App\Links\Models\Link;
use App\Folders\Models\Folder;
use App\LinkOverlays\Models\LinkOverlay;
use App\LinkPages\Models\LinkPage;
use App\Links\Actions\CrupdateLink;
use App\Links\Console\ArchiveExpiredLinkeables;
use App\QrCodes\Models\QrCode;
use App\TrackingPixels\Models\TrackingPixel;
use App\Models\User;
use App\Webhooks\Models\Webhook;
use App\Tags\Models\Tag;
use App\Webhooks\Console\DeleteOldWebhookDeliveries;
use Common\Auth\Events\UserCreated;
use Common\Auth\Models\BaseUser;
use Common\Core\Bootstrap\BootstrapData;
use Common\Domains\CustomDomain;
use Common\Pages\CustomPage;
use Common\API\PublicApiDocsFilter;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\Listeners\AttachWorkspaceToUser;
use Chapa\Chapa\ChapaServiceProvider;
use Dedoc\Scramble\Scramble;
use Dedoc\Scramble\Support\Generator\OpenApi;
use Dedoc\Scramble\Support\Generator\SecurityScheme;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;
use Jenssegers\Agent\Agent;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Registered;
use Illuminate\Routing\Route;
use Illuminate\Support\Str;

const WORKSPACED_RESOURCES = [
    Link::class,
    Folder::class,
    LinkPage::class,
    Biolink::class,
    LinkOverlay::class,
    TrackingPixel::class,
    CustomDomain::class,
];

const WORKSPACE_HOME_ROUTE = '/dashboard';

class AppServiceProvider extends ServiceProvider
{
    public function boot()
    {
        $this->app->bind(BootstrapData::class, AppBootstrapData::class);

        Relation::morphMap([
            Link::MODEL_TYPE => Link::class,
            Folder::MODEL_TYPE => Folder::class,
            CustomPage::MODEL_TYPE => CustomPage::class,
            LinkPage::MODEL_TYPE => LinkPage::class,
            Biolink::MODEL_TYPE => Biolink::class,
            LinkOverlay::MODEL_TYPE => LinkOverlay::class,
            TrackingPixel::MODEL_TYPE => TrackingPixel::class,
            Webhook::MODEL_TYPE => Webhook::class,
            CustomDomain::MODEL_TYPE => CustomDomain::class,
            QrCode::MODEL_TYPE => QrCode::class,
            BaseUser::MODEL_TYPE => User::class,
            Tag::MODEL_TYPE => Tag::class,
        ]);

        Model::preventLazyLoading(!app()->isProduction());

        Scramble::throwOnError(true);

        Scramble::configure()->withDocumentTransformers(function (
            OpenApi $openApi,
        ) {
            $openApi->secure(SecurityScheme::http('bearer'));
        });

        Scramble::registerApi('internal')->expose(
            ui: '/docs/api-internal',
            document: '/docs/api-internal.json',
        );

        Scramble::registerApi('public')
            ->routes(
                fn(Route $route) => Str::startsWith(
                    $route->uri,
                    config('scramble.api_path', 'api/v1'),
                ) && !PublicApiDocsFilter::shouldExcludeRoute($route),
            )
            ->withDocumentTransformers(function (OpenApi $document) {
                PublicApiDocsFilter::removeExcludedOperations(
                    $document,
                    excludedTags: [
                        'Admin',
                        'Comments',
                        'Followers',
                        'Files',
                        'Reports',
                        'Votes',
                        'PasswordResetLink', // laravel fortify
                    ],
                );
            });
    }

    public function register()
    {
        $this->app->register(ChapaServiceProvider::class);
        Scramble::ignoreDefaultRoutes();

        $this->commands([
            ResetDemoSite::class,
            SeedDemoData::class,
            DeleteOldWebhookDeliveries::class,
            ArchiveExpiredLinkeables::class,
            DisableExpiredLeapLinks::class,
        ]);

        $this->app->singleton(Agent::class, function () {
            return new Agent();
        });

        Event::listen(Login::class, AttachWorkspaceToUser::class);
        Event::listen(Registered::class, AttachWorkspaceToUser::class);

        Event::listen(UserCreated::class, function (UserCreated $e) {
            $workspace = (new CreateWorkspace())->createPersonalWorkspace(
                $e->user,
            );

            (new CrupdateBiolink())->execute([
                'name' => __('Landing page'),
                'user_id' => $e->user->id,
                'workspace_id' => $workspace->id,
            ]);

            if (isset($e->data['registration_data'])) {
                $data = json_decode(
                    base64_decode($e->data['registration_data']),
                    true,
                );
                if (isset($data['long_url'])) {
                    (new CrupdateLink())->execute([
                        'long_url' => $data['long_url'],
                        'user_id' => $e->user->id,
                        'workspace_id' => $workspace->id,
                    ]);
                }
            }
        });
    }
}
