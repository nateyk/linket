<?php

namespace Ai;

use Ai\AiAgent\Chunks\DeleteEmbeddingArtifacts;
use Ai\AiAgent\Commands\DeleteFlowUploadArtifactsCommand;
use Ai\AiAgent\Commands\DeleteToolArtifactsCommand;
use Ai\AiAgent\Ingest\Articles\IngestPendingArticlesCommand;
use Ai\AiAgent\Ingest\Snippets\IngestPendingSnippetsCommand;
use Ai\AiAgent\Ingest\Web\ProcessWebpageIngestQueueCommand;
use Ai\AiAgent\Middleware\ScopeConversationsToPreviewMode;
use Ai\AiAgent\Models\AiAgent;
use Ai\AiAgent\Models\AiAgentChunk;
use Ai\AiAgent\Models\AiAgentDocument;
use Ai\AiAgent\Models\AiAgentSession;
use Ai\AiAgent\Models\AiAgentSnippet;
use Ai\AiAgent\Models\AiAgentVector;
use Ai\AiAgent\Models\AiAgentWebpage;
use Ai\Policies\AiAgentPolicy;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class AiServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // config
        $this->mergeConfigFrom(
            __DIR__ . '/../config/searchable_models.php',
            'searchable_models',
        );
        $this->mergeConfigFrom(
            __DIR__ . '/../config/upload-middleware.php',
            'upload-middleware',
        );
        $this->replaceConfigRecursivelyFrom(
            __DIR__ . '/../config/scout.php',
            'scout',
        );
        $this->mergeConfigFrom(__DIR__ . '/../config/app.php', 'app');
        $this->mergeConfigFrom(
            __DIR__ . '/../config/setting-validators.php',
            'setting-validators',
        );

        // Routes
        if (!app()->routesAreCached()) {
            Route::prefix('api')
                ->middleware('api')
                ->group(function () {
                    $this->loadRoutesFrom(__DIR__ . '/../routes/api.php');
                });
        }

        // Migrations
        $this->loadMigrationsFrom(__DIR__ . '/../database/migrations');

        // Policies
        Gate::policy('aiAgent', AiAgentPolicy::class);

        // Middleware
        $this->app['router']->pushMiddlewareToGroup(
            'api',
            ScopeConversationsToPreviewMode::class,
        );
        $this->app['router']->pushMiddlewareToGroup(
            'web',
            ScopeConversationsToPreviewMode::class,
        );

        // Morph map (non-enforcing — Linket already registers many morph types)
        Relation::morphMap([
            AiAgentChunk::MODEL_TYPE => AiAgentChunk::class,
            AiAgentVector::MODEL_TYPE => AiAgentVector::class,
            AiAgentDocument::MODEL_TYPE => AiAgentDocument::class,
            AiAgentWebpage::MODEL_TYPE => AiAgentWebpage::class,
            AiAgentSession::MODEL_TYPE => AiAgentSession::class,
            AiAgentSnippet::MODEL_TYPE => AiAgentSnippet::class,
            AiAgent::MODEL_TYPE => AiAgent::class,
        ]);

        // Views
        $this->loadViewsFrom(
            __DIR__ . '/../resources/views/prompts',
            'prompts',
        );

        // Commands
        if ($this->app->runningInConsole()) {
            $this->commands([
                IngestPendingArticlesCommand::class,
                IngestPendingSnippetsCommand::class,
                ProcessWebpageIngestQueueCommand::class,
                DeleteEmbeddingArtifacts::class,
                DeleteFlowUploadArtifactsCommand::class,
                DeleteToolArtifactsCommand::class,
            ]);

            $this->app->booted(function () {
                $schedule = $this->app->make(Schedule::class);
                $schedule->command(DeleteEmbeddingArtifacts::class)->daily();
                $schedule
                    ->command(DeleteFlowUploadArtifactsCommand::class)
                    ->weekly();
                $schedule->command(DeleteToolArtifactsCommand::class)->daily();

                if (settings('aiAgent.enabled')) {
                    $schedule
                        ->command(IngestPendingArticlesCommand::class)
                        ->everyMinute()
                        ->withoutOverlapping();
                    $schedule
                        ->command(IngestPendingSnippetsCommand::class)
                        ->everyMinute()
                        ->withoutOverlapping();
                    $schedule
                        ->command(ProcessWebpageIngestQueueCommand::class)
                        ->everyMinute();
                }
            });
        }
    }
}
