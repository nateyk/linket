<?php

namespace Ai\AiAgent\Conversations\Streaming;

use App\Conversations\Models\ConversationItem;

class EventEmitter
{
    public static $streaming = false;

    public static function responseDelta(string $content): void
    {
        self::emitEvent(
            'delta',
            json_encode([
                'delta' => $content,
            ]),
        );
    }

    public static function messageCreated(array|ConversationItem $message): void
    {
        self::emitEvent(
            'message',
            json_encode([
                'type' => 'messageCreated',
                'message' =>
                    $message instanceof ConversationItem
                        ? $message->toArray()
                        : $message,
            ]),
        );
    }

    public static function typing(): void
    {
        self::emitEvent(
            'message',
            json_encode([
                'type' => 'typing',
            ]),
        );
    }

    public static function conversationCreated(array $data): void
    {
        self::emitEvent(
            'message',
            json_encode([
                'type' => 'conversationCreated',
                'data' => $data,
            ]),
        );
    }

    public static function debug(string $type, array $data): void
    {
        if (!config('app.debug')) {
            return;
        }

        self::emitEvent(
            'debug',
            json_encode([
                'type' => $type,
                'data' => $data,
            ]),
        );
    }

    public static function error(string $message, array|null $data = null): void
    {
        if (!config('app.debug')) {
            return;
        }

        self::emitEvent(
            'debug',
            json_encode([
                'type' => 'error',
                'data' => [
                    'message' => $message,
                    ...(array) $data,
                ],
            ]),
        );
    }

    public static function startStream(): void
    {
        self::$streaming = true;
    }

    public static function endStream(): void
    {
        self::$streaming = false;
        self::emitEvent(
            'message',
            json_encode([
                'type' => 'endStream',
                'value' => '[END]',
            ]),
        );
    }

    public static function endDeltaStream(): void
    {
        self::emitEvent(
            'message',
            json_encode([
                'type' => 'endDeltaStream',
                'value' => '[END_DELTA]',
            ]),
        );
    }

    public static function emitEvent(string $name, string $content): void
    {
        if (!self::$streaming) {
            return;
        }

        echo "event: $name\n";
        echo 'data: ' . $content;
        echo "\n\n";

        if (ob_get_level() > 0) {
            ob_flush();
        }
        flush();
    }
}
