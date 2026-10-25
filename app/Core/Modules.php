<?php

namespace App\Core;

use Illuminate\Foundation\Application;

/**
 * Optional BeDesk addons (Envato / LiveChat / AI). Phase 1 keeps them uninstalled.
 */
class Modules
{
    public static function livechatInstalled(): bool
    {
        return (bool) (config('modules.livechat.installed') ?? false);
    }

    public static function aiInstalled(): bool
    {
        return (bool) (config('modules.ai.installed') ?? false);
    }

    public static function envatoInstalled(): bool
    {
        return (bool) (config('modules.envato.installed') ?? false);
    }

    public static function register(Application $app): void
    {
        $providers = [
            'envato' => 'Envato\\EnvatoServiceProvider',
            'livechat' => 'Livechat\\LiveChatServiceProvider',
            'ai' => 'Ai\\AiServiceProvider',
        ];

        foreach ($providers as $key => $class) {
            if (! static::safeClassExists($class)) {
                continue;
            }

            config()->set(["modules.{$key}.installed" => true]);
            if ($key === 'livechat') {
                config()->set(['modules.livechat.setup' => true]);
            }

            (new $class($app))->register();
        }
    }

    public static function boot(Application $app): void
    {
        if (static::safeClassExists('Envato\\EnvatoServiceProvider')) {
            (new \Envato\EnvatoServiceProvider($app))->boot();
            config()->set([
                'modules.envato.setup' => (bool) (
                    config('services.envato.client_id') &&
                    config('services.envato.client_secret') &&
                    config('services.envato.personal_token') &&
                    settings('envato.enable')
                ),
            ]);
        }

        if (static::safeClassExists('Livechat\\LiveChatServiceProvider')) {
            (new \Livechat\LiveChatServiceProvider($app))->boot();
        }

        if (static::safeClassExists('Ai\\AiServiceProvider')) {
            (new \Ai\AiServiceProvider($app))->boot();
            config()->set([
                'modules.ai.setup' => (bool) (
                    config('services.openai.api_key') ||
                    config('services.anthropic.api_key') ||
                    config('services.gemini.api_key') ||
                    config('services.openrouter.api_key')
                ),
            ]);
        }
    }

    protected static function safeClassExists(string $className): bool
    {
        try {
            return class_exists($className);
        } catch (\Throwable) {
            return false;
        }
    }
}
