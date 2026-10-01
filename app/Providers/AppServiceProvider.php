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
use App\Entitlements\Entitlements;
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
use Common\Workspaces\Models\Workspace;
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
use App\Stores\Models\Store;
use App\Http\Middleware\AddDeprecationHeader;
use Illuminate\Support\Facades\Gate;
use Illuminate\Cookie\Middleware\EncryptCookies;
use App\Storefront\OrderRecoveryService;

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
        EncryptCookies::except(OrderRecoveryService::COOKIE);

        $this->app->bind(BootstrapData::class, AppBootstrapData::class);

        Relation::enforceMorphMap([
            Link::MODEL_TYPE => Link::class,
            Folder::MODEL_TYPE => Folder::class,
            CustomPage::MODEL_TYPE => CustomPage::class,
            LinkPage::MODEL_TYPE => LinkPage::class,
            'store' => Store::class,
            'biolink' => Store::class,
            LinkOverlay::MODEL_TYPE => LinkOverlay::class,
            TrackingPixel::MODEL_TYPE => TrackingPixel::class,
            Webhook::MODEL_TYPE => Webhook::class,
            CustomDomain::MODEL_TYPE => CustomDomain::class,
            QrCode::MODEL_TYPE => QrCode::class,
            BaseUser::MODEL_TYPE => User::class,
            Tag::MODEL_TYPE => Tag::class,
        ]);

        Gate::policy(Store::class, \App\Biolinks\Policies\BiolinkPolicy::class);
        Gate::policy(Biolink::class, \App\Biolinks\Policies\BiolinkPolicy::class);
        Gate::policy(\App\Courses\Models\Course::class, \App\Courses\Policies\CoursePolicy::class);

        $this->app['router']->aliasMiddleware('addDeprecationHeader', AddDeprecationHeader::class);

        \Illuminate\Support\Facades\Route::bind('store', fn($v) => Store::findOrFail($v));
        \Illuminate\Support\Facades\Route::bind('biolink', fn($v) => Store::findOrFail($v));
        \Illuminate\Support\Facades\Route::bind('biolinkId', fn($v) => Store::findOrFail($v));

        Model::preventLazyLoading(!app()->isProduction());

        Workspace::creating(function (Workspace $workspace): void {
            if ($workspace->is_personal) {
                return;
            }
            $owner = User::find($workspace->owner_id);
            if (!$owner) {
                return;
            }
            $entitlements = app(Entitlements::class);
            $limit = $entitlements->limit($owner, 'max_workspaces');
            if ($limit === null) {
                return;
            }
            $count = Workspace::where('owner_id', $owner->id)->where('is_personal', false)->count();
            abort_if($count >= $limit, 422, __(
                "You've reached your :plan limit of :count workspaces.",
                ['plan' => $entitlements->planFor($owner)?->name ?? 'plan', 'count' => $limit],
            ));
        });

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

        $this->registerCourseRoutes();
    }

    private function registerCourseRoutes(): void
    {
        \Illuminate\Support\Facades\Route::prefix('api/v1')->middleware(['api', 'optionalAuth:sanctum', 'verified', 'verifyApiAccess'])->group(function () {
            // Creator course management
            \Illuminate\Support\Facades\Route::get('courses/{course}', [\App\Courses\Controllers\CoursesController::class, 'show']);
            \Illuminate\Support\Facades\Route::get('courses/{course}/analytics', [\App\Courses\Controllers\CoursesController::class, 'analytics']);
            \Illuminate\Support\Facades\Route::put('courses/{course}', [\App\Courses\Controllers\CoursesController::class, 'update']);
            \Illuminate\Support\Facades\Route::post('courses/{course}/publish', [\App\Courses\Controllers\CoursesController::class, 'publish']);
            \Illuminate\Support\Facades\Route::post('courses/{course}/unpublish', [\App\Courses\Controllers\CoursesController::class, 'unpublish']);
            \Illuminate\Support\Facades\Route::post('courses/{course}/chapters/reorder', [\App\Courses\Controllers\CoursesController::class, 'reorderChapters']);
            \Illuminate\Support\Facades\Route::get('courses/{course}/preview', [\App\Courses\Controllers\CoursesController::class, 'preview']);
            \Illuminate\Support\Facades\Route::get('courses/{course}/curriculum', [\App\Courses\Controllers\StudentCoursesController::class, 'curriculum']);

            \Illuminate\Support\Facades\Route::post('courses/{course}/chapters', [\App\Courses\Controllers\ChaptersController::class, 'store']);
            \Illuminate\Support\Facades\Route::put('course-chapters/{chapter}', [\App\Courses\Controllers\ChaptersController::class, 'update']);
            \Illuminate\Support\Facades\Route::delete('course-chapters/{chapter}', [\App\Courses\Controllers\ChaptersController::class, 'destroy']);
            \Illuminate\Support\Facades\Route::post('course-chapters/{chapter}/lessons/reorder', [\App\Courses\Controllers\ChaptersController::class, 'reorderLessons']);

            \Illuminate\Support\Facades\Route::post('course-chapters/{chapter}/lessons', [\App\Courses\Controllers\LessonsController::class, 'store']);
            \Illuminate\Support\Facades\Route::get('course-lessons/{lesson}', [\App\Courses\Controllers\LessonsController::class, 'show']);
            \Illuminate\Support\Facades\Route::put('course-lessons/{lesson}', [\App\Courses\Controllers\LessonsController::class, 'update']);
            \Illuminate\Support\Facades\Route::delete('course-lessons/{lesson}', [\App\Courses\Controllers\LessonsController::class, 'destroy']);
            \Illuminate\Support\Facades\Route::post('course-lessons/{lesson}/duplicate', [\App\Courses\Controllers\LessonsController::class, 'duplicate']);
            \Illuminate\Support\Facades\Route::post('course-lessons/{lesson}/move', [\App\Courses\Controllers\LessonsController::class, 'move']);

            \Illuminate\Support\Facades\Route::post('course-lessons/{lesson}/resources', [\App\Courses\Controllers\LessonResourcesController::class, 'store']);
            \Illuminate\Support\Facades\Route::delete('course-lesson-resources/{resource}', [\App\Courses\Controllers\LessonResourcesController::class, 'destroy']);
            \Illuminate\Support\Facades\Route::get('course-lesson-resources/{resource}/download', [\App\Courses\Controllers\LessonResourcesController::class, 'download']);

            \Illuminate\Support\Facades\Route::post('course-lessons/{lesson}/quiz', [\App\Courses\Controllers\QuizzesController::class, 'store']);
            \Illuminate\Support\Facades\Route::put('quizzes/{quiz}', [\App\Courses\Controllers\QuizzesController::class, 'update']);
            \Illuminate\Support\Facades\Route::delete('quizzes/{quiz}', [\App\Courses\Controllers\QuizzesController::class, 'destroy']);

        });

        \Illuminate\Support\Facades\Route::prefix('api/v1')->middleware(['api', 'optionalAuth:sanctum'])->group(function () {
            // Student (optionalAuth for test compat, controller handles 401)
            \Illuminate\Support\Facades\Route::get('course-lessons/{lesson}/quiz', [\App\Courses\Controllers\QuizzesController::class, 'show']);
            \Illuminate\Support\Facades\Route::post('quizzes/{quiz}/attempts', [\App\Courses\Controllers\QuizAttemptsController::class, 'store']);
            \Illuminate\Support\Facades\Route::get('quizzes/{quiz}/attempts', [\App\Courses\Controllers\QuizAttemptsController::class, 'index']);
            \Illuminate\Support\Facades\Route::get('my-courses', [\App\Courses\Controllers\StudentCoursesController::class, 'myCourses']);
            \Illuminate\Support\Facades\Route::get('courses/{course}/learn', [\App\Courses\Controllers\StudentCoursesController::class, 'show']);
            \Illuminate\Support\Facades\Route::get('courses/{course}/learn/lessons/{lesson}', [\App\Courses\Controllers\StudentCoursesController::class, 'lesson']);
            \Illuminate\Support\Facades\Route::post('course-lessons/{lesson}/complete', [\App\Courses\Controllers\LessonProgressController::class, 'complete']);
            \Illuminate\Support\Facades\Route::post('course-lessons/{lesson}/uncomplete', [\App\Courses\Controllers\LessonProgressController::class, 'uncomplete']);
            \Illuminate\Support\Facades\Route::get('courses/{course}/progress', [\App\Courses\Controllers\LessonProgressController::class, 'progress']);
        });

        // Public curriculum (no auth). The "api" group is required here so
        // SubstituteBindings runs and {course} resolves to a Course model.
        \Illuminate\Support\Facades\Route::prefix('api/v1/public')->middleware(['api'])->group(function () {
            \Illuminate\Support\Facades\Route::get('courses/{course}/curriculum', [\App\Courses\Controllers\StudentCoursesController::class, 'curriculum']);
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
        Event::listen(\Illuminate\Auth\Events\Verified::class, \App\Courses\Listeners\ClaimCourseEnrollmentsOnVerified::class);

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
