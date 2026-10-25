<?php

namespace App\Providers;

use App\Attributes\Models\CustomAttribute;
use App\Attributes\Policies\AttributePolicy;
use App\CannedReplies\Models\CannedReply;
use App\CannedReplies\Policies\CannedReplyPolicy;
use App\Contacts\Models\PageVisit;
use App\Console\Commands\MigrateLinketHelpToHcCommand;
use App\Conversations\Commands\DeleteTestConversationsCommand;
use App\Conversations\Email\Commands\ImportEmailsViaImap;
use App\Conversations\Events\ConversationCreated;
use App\Conversations\Events\ConversationMessageCreated;
use App\Conversations\Events\ConversationsAssignedToAgent;
use App\Conversations\Events\ConversationsUpdated;
use App\Conversations\Listeners\SendReplyCreatedNotif;
use App\Conversations\Listeners\SendTicketsAssignedNotif;
use App\Conversations\Models\Conversation;
use App\Conversations\Policies\ConversationFileEntryPolicy;
use App\Conversations\Policies\ConversationPolicy;
use App\Core\Listeners\DeleteUserRelations;
use App\Core\Modules;
use App\Core\UrlGenerator;
use App\HelpCenter\Models\HcArticle;
use App\HelpCenter\Models\HcCategory;
use App\HelpCenter\Models\SearchTerm;
use App\HelpCenter\Policies\HcArticlePolicy;
use App\Team\Models\AgentInvite;
use App\Team\Models\Group;
use App\Team\Policies\GroupPolicy;
use App\Reports\Policies\HelpdeskReportPolicy;
use App\Triggers\Models\Trigger;
use App\Triggers\Policies\TriggerPolicy;
use App\Triggers\TriggersCycle;
use Common\Auth\Events\UserCreated;
use Common\Auth\Events\UsersDeleted;
use Common\Core\Contracts\AppUrlGenerator;
use Common\Websockets\API\WebsocketAPI;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class SupportServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(AppUrlGenerator::class, UrlGenerator::class);
        Modules::register($this->app);
    }

    public function boot(): void
    {
        Gate::policy(HcArticle::class, HcArticlePolicy::class);
        Gate::policy(HcCategory::class, HcArticlePolicy::class);
        Gate::policy(Conversation::class, ConversationPolicy::class);
        Gate::policy(CustomAttribute::class, AttributePolicy::class);
        Gate::policy(CannedReply::class, CannedReplyPolicy::class);
        Gate::policy(Group::class, GroupPolicy::class);
        Gate::policy(Trigger::class, TriggerPolicy::class);
        Gate::policy('conversationFileEntry', ConversationFileEntryPolicy::class);
        Gate::policy('helpdeskReport', HelpdeskReportPolicy::class);

        // Morph map entries are registered in AppServiceProvider (merge-safe).

        $this->commands([
            ImportEmailsViaImap::class,
            DeleteTestConversationsCommand::class,
            MigrateLinketHelpToHcCommand::class,
        ]);

        $this->app->booted(function () {
            if (! $this->app->runningInConsole()) {
                return;
            }

            $schedule = $this->app->make(Schedule::class);
            $schedule
                ->call(function () {
                    (new TriggersCycle())->executeTimeBasedTriggers();
                })
                ->name('triggers:runTimeBased')
                ->hourly()
                ->withoutOverlapping(60);
        });

        $this->app->singleton(WebsocketAPI::class, function (
            Application $app,
            array $options = [],
        ) {
            return new WebsocketAPI($options ?? []);
        });

        $this->registerEvents();
        Modules::boot($this->app);
    }

    protected function registerEvents(): void
    {
        Event::listen(UsersDeleted::class, DeleteUserRelations::class);

        Event::listen(UserCreated::class, function (UserCreated $e) {
            if (method_exists($e->user, 'isAgent') && $e->user->isAgent()) {
                Group::findDefault()
                    ?->users()
                    ->syncWithoutDetaching([
                        $e->user->id => [
                            'created_at' => now(),
                        ],
                    ]);
            }
        });

        Event::listen(UsersDeleted::class, function (UsersDeleted $e) {
            foreach ($e->users as $user) {
                Group::findDefault()?->users()->detach($user);
            }
        });

        Event::listen(
            ConversationsAssignedToAgent::class,
            SendTicketsAssignedNotif::class,
        );
        Event::listen(
            ConversationMessageCreated::class,
            SendReplyCreatedNotif::class,
        );

        Event::listen(ConversationsUpdated::class, function (
            ConversationsUpdated $e,
        ) {
            if (TriggersCycle::$isRunning) {
                return false;
            }

            $cycle = new TriggersCycle();
            foreach ($e->conversationsAfterUpdate as $conversation) {
                if ($conversation->assigned_to === Conversation::ASSIGNED_AGENT) {
                    $cycle->runAgainstConversation(
                        $conversation,
                        $e->conversationsDataBeforeUpdate[$conversation->id] ?? null,
                    );
                }
            }
        });

        Event::listen(ConversationCreated::class, function (
            ConversationCreated $e,
        ) {
            if ($e->conversation->assigned_to === Conversation::ASSIGNED_AGENT) {
                (new TriggersCycle())->runAgainstConversation($e->conversation);
            }
        });
    }
}
