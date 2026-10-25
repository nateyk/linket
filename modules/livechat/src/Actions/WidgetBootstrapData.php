<?php

namespace Livechat\Actions;

use Common\Localizations\Localization;
use Common\Settings\Themes\CssTheme;
use Common\Websockets\GetWebsocketCredentialsForClient;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use App\Team\LoadAllCompactAgents;
use Livechat\Chats\BuildNewChatGreeting;
use Livechat\Widget\Users\WidgetCustomerResource;
use Livechat\Widget\WidgetConversationLoader;

class WidgetBootstrapData
{
    public array $data = [];
    public ?CssTheme $initialTheme = null;

    public function __construct()
    {
        $this->initData();
    }

    protected function initData(): void
    {
        // might be passed through via iframe url
        $flowId = request('flowId') ? (int) request('flowId') : null;
        $conversationId = request('conversationId')
            ? (int) request('conversationId')
            : null;
        $scopedHcCategoryId = request('scopedHcCategoryId')
            ? (int) request('scopedHcCategoryId')
            : null;

        $customer = Auth::user();
        $activeConversation = (new WidgetConversationLoader())->activeConversationFor(
            $customer,
            $conversationId,
        );

        $settings = settings()->getUnflattened();
        $settings['base_url'] = config('app.url');
        $settings[
            'broadcasting'
        ] = (new GetWebsocketCredentialsForClient())->execute();

        $this->data = [
            'themes' => $this->getThemes(),
            'activeConversationData' => $activeConversation,
            'user' => new WidgetCustomerResource($customer),
            'settings' => $settings,
            'agents' => (new LoadAllCompactAgents())->execute(),
            'sessionId' => Str::uuid(),
            'newChatGreeting' => (new BuildNewChatGreeting(
                $customer,
                $flowId,
            ))->execute(),
            'csrf_token' => csrf_token(),
            'scopedHcCategoryId' => $scopedHcCategoryId,
        ];

        $this->data['i18n'] = [
            'locales' => Localization::query()
                ->select(['name', 'language'])
                ->get()
                ->map(function (Localization $localization) {
                    if (
                        settings('i18n.enable', true) &&
                        $localization->language === app()->getLocale()
                    ) {
                        $localization->loadLines();
                    }
                    return [
                        'name' => $localization->name,
                        'language' => $localization->language,
                        'lines' => $localization->lines ?? [],
                    ];
                }),
            'active' => app()->getLocale(),
        ];

        $this->setInitialTheme();

        if ($this->data['user']) {
            $this->data['user']->createOrTouchSession();
        }
    }

    protected function getThemes(): Collection
    {
        $themes = CssTheme::query()
            ->where(
                'type',
                settings('chatWidget.inheritThemes') ? 'site' : 'chatWidget',
            )
            ->where(function (Builder $builder) {
                $builder
                    ->where('default_dark', true)
                    ->orWhere('default_light', true);
            })
            ->get();

        if ($themes->isEmpty()) {
            $themes = CssTheme::query()->limit(2)->get();
        }

        return $themes;
    }

    protected function setInitialTheme(): void
    {
        $themes = $this->data['themes'];

        if ($defaultTheme = settings('chatWidget.defaultTheme')) {
            // when default theme is set to system, use light theme
            // initially as there's no way to get user's preference
            // without javascript. Correct theme variables will be set once front end loads.
            if ($defaultTheme === 'system' || $defaultTheme === 'light') {
                $this->initialTheme = $themes
                    ->where('default_light', true)
                    ->first();
            } else {
                $this->initialTheme = $themes
                    ->where('default_dark', true)
                    ->first();
            }
        }

        // finally, fallback to default light theme
        if (!$this->initialTheme) {
            $this->initialTheme =
                $themes->where('default_light', true)->first() ??
                $themes->first();
        }
    }
}
