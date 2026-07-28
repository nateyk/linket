<?php

namespace Common\Logging\Mail;

use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Http\Resources\Json\JsonResource;
use ZBateson\MailMimeParser\Message;

/**
 * @mixin OutgoingEmailLogItem
 */
#[SchemaName('OutgoingEmailLogItem')]
class OutgoingEmailLogItemResource extends JsonResource
{
    public function __construct(
        mixed $resource,
        protected string|null $includesPreset = null,
    ) {
        parent::__construct($resource);
    }

    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'message_id' => $this->message_id,
            'status' => $this->status,
            'from' => $this->from,
            'to' => $this->to,
            'subject' => $this->subject,
            'created_at' => $this->created_at,
            'parsed_message' => $this->when(
                $this->includesPreset === 'show',
                function () {
                    $message = Message::from($this->mime, true);
                    return [
                        'headers' => collect(
                            $message->getAllHeaders(),
                        )->mapWithKeys(
                            fn($header) => [
                                $header->getName() => $header->getValue(),
                            ],
                        ),
                        'body' => [
                            'text' => $message->getTextContent(),
                            'html' => $message->getHtmlContent(),
                        ],
                    ];
                },
            ),
        ];
    }
}
