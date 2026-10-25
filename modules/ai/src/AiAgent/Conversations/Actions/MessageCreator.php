<?php

namespace Ai\AiAgent\Conversations\Actions;

use Ai\AiAgent\Conversations\Streaming\EventEmitter;
use App\Conversations\Events\ConversationMessageCreated;
use App\Conversations\Models\Conversation;
use Illuminate\Support\Str;
use League\CommonMark\CommonMarkConverter;
use League\CommonMark\Extension\DefaultAttributes\DefaultAttributesExtension;
use League\CommonMark\Extension\CommonMark\Node\Inline\Link;

class MessageCreator
{
    protected CommonMarkConverter $converter;

    public function __construct(protected Conversation $conversation)
    {
        $this->converter = new CommonMarkConverter([
            'html_input' => 'strip',
            'allow_unsafe_links' => false,
            'default_attributes' => [
                Link::class => [
                    'target' => '_blank',
                ],
            ],
        ]);

        $this->converter
            ->getEnvironment()
            ->addExtension(new DefaultAttributesExtension());
    }

    public function genericErrorMessage()
    {
        if (settings('aiAgent.transfer.type') === 'instruction') {
            $this->genericMessage(
                __(
                    "Sorry, I'm having some issues. Can you try asking your question again?",
                ),
            );
            return;
        }

        $this->genericMessage(
            __(
                "Sorry, I'm having some issues and can't help you at the moment. Do you want to talk to a person instead?",
            ),
            [
                'buttons' => [$this->getTalkToAgentButton()],
            ],
        );
    }

    public function genericMessage(string $messageText, array|null $data = null)
    {
        $html = $this->converter
            ->convert(str_replace('\\n', "\n", $messageText))
            ->getContent();

        $messageData = [
            'body' => !trim($html) ? $messageText : $html,
            'type' => 'message',
            'author' => 'bot',
            'created_at' => now(),
            'updated_at' => now(),
        ];

        if ($data) {
            $messageData['data'] = $data;
        }

        $message = $this->conversation
            ? $this->conversation->items()->create($messageData)
            : [
                'id' => Str::uuid()->toString(),
                ...$messageData,
            ];

        EventEmitter::messageCreated($message);

        if ($this->conversation) {
            event(
                new ConversationMessageCreated($this->conversation, $message),
            );
        }

        return $message;
    }

    protected function getTalkToAgentButton()
    {
        return [
            'name' => __('Talk to a person') . ' 👤',
            'action' => 'transfer',
        ];
    }
}
