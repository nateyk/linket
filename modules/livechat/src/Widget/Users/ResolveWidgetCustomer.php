<?php

namespace Livechat\Widget\Users;

use App\Contacts\Events\HelpDeskUserCreated;
use App\Models\User;
use Illuminate\Support\Arr;
use Livechat\Widget\Middleware\AuthenticateWidget;

class ResolveWidgetCustomer
{
    public function execute(int|null $mainSessionUserId = null): void
    {
        $externalData = $this->getExternalUserData();
        $isWidgetHome = request()->routeIs('chatWidgetHome');
        $isAiAgentPreviewMode = request()->routeIs('aiAgentPreviewMode');
        $emailHash = Arr::pull($externalData, 'email_hash');

        // if enforce hmac is enabled and no email hash is provided, bail
        if (
            !empty($externalData) &&
            settings('lc.enforce_hmac') &&
            !$emailHash
        ) {
            return;
        }

        // in conversation preview mode, login the agent/admin that is testing the converastion
        if ($isAiAgentPreviewMode) {
            if (!auth('chatWidget')->check()) {
                $user = User::findOrFail($mainSessionUserId);
                $this->setUserOnSession($user);
            }
            return;
        }

        // if email hash is provided, use this to auth user, overriding user set in laravel session cookie
        if (
            $emailHash &&
            isset($externalData['email']) &&
            $isWidgetHome &&
            $this->hashMatches($externalData['email'], $emailHash)
        ) {
            $email = $externalData['email'];
            $externalData = Arr::except($externalData, ['email_hash', 'email']);
            if ($user = User::where('email', $email)->first()) {
                $newUser = $user;
                $this->insertCustomFields($newUser, $externalData);
            } else {
                $newUser = $this->createNewUser(
                    $externalData,
                    primaryEmail: $email,
                );
            }

            $this->setUserOnSession($newUser);
            return;
        }

        // already logged in, only update attributes
        if (auth('chatWidget')->check()) {
            if (!empty($externalData)) {
                $this->insertCustomFields(
                    auth('chatWidget')->user(),
                    $externalData,
                );
            }
            return;
        }

        // only create new user on widget boostrap route
        if ($isWidgetHome) {
            $newUser = $this->createNewUser($externalData);
            $this->setUserOnSession($newUser);
        }
    }

    protected function createNewUser(
        array $externalData,
        string|null $primaryEmail = null,
    ): User {
        $ip = getIp();
        $geo = geoip($ip);
        $user = User::create([
            'name' => $externalData['name'] ?? null,
            'email' => $primaryEmail ?? null,
            'country' => $geo['iso_code'],
            'language' => $externalData['language'] ?? $geo['language'],
            'timezone' => $geo['timezone'],
            'type' => 'user',
        ]);

        // name and email will be handled here already, no need to update it again
        if (!empty($externalData)) {
            $this->insertCustomFields($user, $externalData);
        }

        event(new HelpDeskUserCreated($user, 'chatWidget'));

        return $user;
    }

    protected function getExternalUserData(): array
    {
        $data = request()->get('user');

        if ($data) {
            try {
                return json_decode(base64_decode($data), true);
            } catch (\Exception $e) {
            }
        }

        return [];
    }

    protected function hashMatches(string $email, string $hash): bool
    {
        return hash_hmac('sha256', $email, config('app.widget_hmac_secret')) ===
            $hash;
    }

    protected function setUserOnSession(User $user): void
    {
        session()->put(AuthenticateWidget::widgetCustomerKey, $user->id);
        auth('chatWidget')->setUser($user);
    }

    protected function insertCustomFields(User $user, array $externalData)
    {
        $user->updateCustomAttributes($externalData);
    }
}
