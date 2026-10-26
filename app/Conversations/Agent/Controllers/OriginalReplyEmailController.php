<?php namespace App\Conversations\Agent\Controllers;

use App\Conversations\Email\EmailStore;
use App\Conversations\Messages\MessageBodyPurifier;
use App\Conversations\Models\ConversationItem;
use Common\Core\BaseController;

class OriginalReplyEmailController extends BaseController
{
    public function show(int $messageId)
    {
        $message = ConversationItem::findOrFail($messageId);

        $this->authorize('show', $message->conversation);

        $original = (new EmailStore())->getEmailForReply($message);

        if (is_array($original)) {
            $original = $this->sanitizeEmailHtml($original);
        }

        return $this->success(['email' => $original]);
    }

    public function download(int $messageId)
    {
        $message = ConversationItem::findOrFail($messageId);

        $this->authorize('show', $message->conversation);

        return (new EmailStore())->download($message);
    }

    protected function sanitizeEmailHtml(array $email): array
    {
        $purifier = new MessageBodyPurifier();

        array_walk_recursive($email, function (&$value) use ($purifier) {
            if (is_string($value) && str_contains($value, '<')) {
                $value = $purifier->emailBody($value);
            }
        });

        return $email;
    }
}
