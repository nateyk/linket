<?php

namespace App\Conversations\Agent\Notifications\Ticketing;

use App\Mail\ReactEmailMailable;
use App\Mail\ReactEmailMessage;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Slack\SlackMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Slack\BlockKit\Blocks\ActionsBlock;

abstract class BaseConversationNotification extends Notification implements
    ShouldQueue
{
    use Queueable;

    /**
     * Provided by extending class.
     */
    public const NOTIF_ID = null;

    abstract protected function mainAction(): array;
    abstract protected function image(): string|null;
    abstract protected function lines(User $notifiable): array;

    public function via(User $notifiable): array
    {
        $channels = [];

        if (
            $sub = $notifiable->notificationSubscriptions
                ->where('notif_id', static::NOTIF_ID)
                ->first()
        ) {
            foreach (array_filter($sub->channels) as $channel => $isSelected) {
                if ($channel === 'browser') {
                    $channels = array_merge($channels, [
                        'database',
                        'broadcast',
                    ]);
                } elseif ($channel === 'email') {
                    $channels[] = 'mail';
                } elseif ($channel === 'slack') {
                    // check if slack is configured, otherwise it will throw an error
                    if (
                        config(
                            'services.slack.notifications.bot_user_oauth_token',
                        ) &&
                        config('services.slack.notifications.channel')
                    ) {
                        $channels[] = 'slack';
                    }
                } else {
                    $channels[] = $channel;
                }
            }
        }

        return $channels;
    }

    public function toMail(User $notifiable): ReactEmailMailable
    {
        $mainAction = $this->mainAction();
        $lines = array_map(
            fn ($line) => trim(strip_tags(str_replace(['**', "\n"], ['', ' '], (string) $line))),
            $this->lines($notifiable),
        );
        $subject = method_exists($this, 'subject')
            ? $this->subject()
            : ($lines[0] ?? __('Conversation update'));

        return ReactEmailMessage::toNotifiable(
            $notifiable,
            $subject,
            $subject,
            $subject,
            $lines,
            $mainAction['label'] ?? null,
            $mainAction['action'] ?? null,
        );
    }

    public function toSlack(User $notifiable): SlackMessage
    {
        return (new SlackMessage())
            ->when($this->image(), function (SlackMessage $message) {
                $message->image($this->image());
            })
            ->text(strip_tags($this->lines($notifiable)[0]))
            ->actionsBlock(function (ActionsBlock $actions) use ($notifiable) {
                $mainAction = $this->mainAction();
                $actions
                    ->button($mainAction['label'])
                    ->url($mainAction['action']);
            });
    }

    public function toArray(User $notifiable): array
    {
        return [
            'image' => $this->image(),
            'mainAction' => $this->mainAction(),
            'lines' => array_map(
                fn($line) => ['content' => $line],
                $this->lines($notifiable),
            ),
        ];
    }

    public function toBroadcast(User $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toArray($notifiable));
    }
}
