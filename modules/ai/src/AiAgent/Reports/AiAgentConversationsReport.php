<?php

namespace Ai\AiAgent\Reports;

use App\Conversations\Models\Conversation;
use Common\Database\Metrics\MetricDateRange;
use Common\Database\Metrics\Traits\GeneratesTrendResults;
use Illuminate\Support\Collection;

class AiAgentConversationsReport
{
    use GeneratesTrendResults;

    protected array $report;

    const NAME = 'aiAgentConversations';

    public function __construct(protected MetricDateRange $dateRange)
    {
        $this->report = [
            'total' => 0,
            'totalInvolved' => 0,
            'totalResolved' => 0,
            'totalEscalated' => 0,
            'label' => __('AI agent conversations'),
            'data' => $this->getAllPossibleDateResults($this->dateRange),
        ];
    }

    public function process(Collection $conversations): void
    {
        $this->report['total'] += $conversations->count();

        $aiAgentConversations = $conversations->filter(
            fn($item) => $item->ai_agent_involved,
        );

        $this->report['totalInvolved'] += $aiAgentConversations->count();

        foreach ($aiAgentConversations as $conversation) {
            if ($conversation->assigned_to === Conversation::ASSIGNED_AGENT) {
                $this->report['totalEscalated'] += 1;
            }

            if (
                $conversation->assigned_to === Conversation::ASSIGNED_BOT &&
                $conversation->status_category <= Conversation::STATUS_CLOSED
            ) {
                $this->report['totalResolved'] += 1;
            }
        }

        $format = $this->dateRange->getGroupingFormat();
        $aiAgentConversations
            ->filter(
                fn($item) => $item->assigned_to ===
                    Conversation::ASSIGNED_BOT &&
                    $item->status_category <= Conversation::STATUS_CLOSED,
            )
            ->groupBy(fn($item) => $item->created_at->format($format))
            ->each(function ($conversations, $key) {
                if (isset($this->report['data'][$key])) {
                    $this->report['data'][$key][
                        'value'
                    ] += $conversations->count();
                }
            });
    }

    public function finalize(): array
    {
        $this->report['data'] = array_values($this->report['data']);
        return $this->report;
    }
}
