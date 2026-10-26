<?php namespace App\Conversations\Email\Webhooks;

use App\Conversations\Email\CreateTicketForFailedOutgoingEmail;
use App\Conversations\Email\Parsing\ParsedEmail;
use App\Conversations\Email\TransformEmailIntoTicketOrReply;
use App\Conversations\Email\Transformers\MailgunMailTransformer;
use Common\Core\BaseController;

class MailgunWebhookController extends BaseController
{
    public function handleIncoming()
    {
        $this->blockOnDemoSite();

        if (!settings('incoming_email.mailgun.enabled')) {
            return $this->success();
        }

        if (!$this->isValidRequest()) {
            return response(
                'Could not verify request is coming from mailgun',
                406,
            );
        }

        $emailData = (new MailgunMailTransformer())->transform(
            request()->all(),
        );
        (new TransformEmailIntoTicketOrReply(
            new ParsedEmail($emailData),
        ))->execute();

        return $this->success();
    }

    public function handleFailed()
    {
        $this->blockOnDemoSite();

        if (!settings('incoming_email.mailgun.enabled')) {
            return $this->success();
        }

        if (!$this->isValidRequest()) {
            return response(
                'Could not verify request is coming from mailgun',
                406,
            );
        }

        (new CreateTicketForFailedOutgoingEmail())->execute([
            'recipient' => request('event-data.recipient'),
            'reason' => request('event-data.reason'),
            'description' => request('event-data.delivery-status.description'),
            'headers' => request('event-data.message.headers'),
        ]);

        return $this->success();
    }

    protected function isValidRequest()
    {
        // Default to enabled: incoming email webhooks should be verified.
        if (! (settings('incoming_email.mailgun.verify') ?? true)) {
            return true;
        }

        $signature = is_array(request('signature'))
            ? request('signature')
            : request()->all();

        $token = $signature['token'] ?? null;
        $timestamp = $signature['timestamp'] ?? null;
        $signature = $signature['signature'] ?? null;

        if (!$token || !$timestamp || !$signature) {
            return false;
        }

        //check if the timestamp is fresh
        if (abs(time() - $timestamp) > 15) {
            return false;
        }

        // Use a dedicated webhook signing key, not the Mailgun API key.
        $webhookKey = settings('incoming_email.mailgun.webhook_secret')
            ?? config('services.mailgun.webhook_secret')
            ?? config('services.mailgun.secret');

        if (!$webhookKey) {
            return false;
        }

        // Use timing-safe comparison.
        return hash_equals(
            hash_hmac('sha256', $timestamp . $token, $webhookKey),
            $signature,
        );
    }
}
