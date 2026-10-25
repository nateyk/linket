<?php

namespace Ai\AiAgent\Reports;

use Common\Database\Metrics\MetricDateRange;
use Common\Database\Metrics\Traits\GeneratesTrendResults;
use Illuminate\Support\Collection;

class AiAgentInvolvmentOverTimeReport
{
    use GeneratesTrendResults;

    protected array $report;

    const NAME = 'aiAgentInvolvmentOverTime';

    public function __construct(protected MetricDateRange $dateRange)
    {
        $this->report = [
            'label' => __('AI agent involvement over time'),
            'total' => 0,
            'totalInvolved' => 0,
            'data' => $this->getAllPossibleDateResults($this->dateRange),
        ];
    }

    public function process(Collection $conversations): void
    {
        $aiAgentConversations = $conversations->filter(
            fn($item) => $item->ai_agent_involved,
        );

        $this->report['total'] = $conversations->count();
        $this->report['totalInvolved'] = $aiAgentConversations->count();

        $format = $this->dateRange->getGroupingFormat();
        $aiAgentConversations
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
