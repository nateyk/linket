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
        if (! method_exists($user, 'notify')) {
            return;
        }

        $email = $user->email ?? null;
        if (! is_string($email) || $email === '') {
            return;
        }

        $user->notify(new WelcomeToLinketNotification());
    }
}
