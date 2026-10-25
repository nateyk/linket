<?php

namespace Ai\AiAgent\Conversations\Data;

enum ClassifierStatusCode: string
{
    case Greeting = 'c01';
    case Thanks = 'c02';
    case Smalltalk = 'c03';
    case TransferToHuman = 'c05';
    case DetailsSupplied = 'c06';
    case Assistance = 'c07';

    public static function isFlowIntent(self $code): bool
    {
        return str_starts_with($code->value, 'f');
    }

    public static function flowIntentCodeToIndex(self $code): int
    {
        if (str_starts_with($code->value, 'f0')) {
            return (int) substr($code->value, 2);
        }

        return (int) substr($code->value, 1);
    }
}
