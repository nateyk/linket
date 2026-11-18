<?php

namespace App\Auth\Listeners;

use App\Auth\Notifications\WelcomeToLinketNotification;
use Illuminate\Auth\Events\Registered;

final class SendWelcomeEmail
{
    public function handle(Registered $event): void
    {
        $this->send($event->user);
    }

    public function send(object $user): void
    {
        $email = $user->email ?? null;
        if (! is_string($email) || $email === '' || ! method_exists($user, 'notify')) {
            return;
        }

        $user->notify(new WelcomeToLinketNotification());
    }
}
