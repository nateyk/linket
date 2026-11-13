<?php

namespace App\Core;

class WidgetFlags
{
    public static function knowledgeScopeTag(): string|null
    {
        return request()->header('X-Widget-Knowledge-Scope-Tag') ?:
            request('xWidgetKnowledgeScopeTag');
    }

    /**
     * The widget forwards its configured Help Center category through this
     * header. Invalid or non-positive values must not broaden the query.
     */
    public static function scopedHcCategoryId(): int|null
    {
        $id = request()->header('X-Scoped-Hc-Category-Id')
            ?: request('scopedHcCategoryId');

        $validated = filter_var($id, FILTER_VALIDATE_INT, [
            'options' => ['min_range' => 1],
        ]);

        return $validated === false ? null : $validated;
    }

    public static function aiAgentId(): int|null
    {
        $id =
            request()->header('X-Widget-Ai-Agent-Id') ?:
            request('xWidgetAiAgentId');
        return $id ? (int) $id : null;
    }

    public static function flowId(): int|null
    {
        $id = request('xWidgetFlowId');
        return $id ? (int) $id : null;
    }

    public static function conversationId(): int|null
    {
        $id = request('xWidgetConversationId');
        return $id ? (int) $id : null;
    }

    public static function isAiAgentPreviewMode(): bool
    {
        return request()->header('X-Ai-Agent-Preview-Mode') === 'true';
    }

    public static function isLivechatWidget(): bool
    {
        return request()->header('X-Chat-Widget') === 'true' ||
            request()->get('_xChatWidget') === 'true' ||
            str_starts_with(request()->path(), 'lc/widget');
    }

    public static function isMobile(): bool
    {
        return request()->header('X-Widget-Is-Mobile') === 'true' ||
            request()->get('xWidgetIsMobile') === 'true';
    }
}
