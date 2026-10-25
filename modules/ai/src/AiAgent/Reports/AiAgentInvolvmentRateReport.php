<?php

namespace Ai\AiAgent\Reports;

use Common\Database\Metrics\MetricDateRange;
use Illuminate\Support\Collection;

class AiAgentInvolvmentRateReport
{
    protected array $report;

    const NAME = 'aiAgentInvolvment';

    public function __construct(protected MetricDateRange $dateRange)
    {
        $this->report = [
            'label' => __('AI agent involvement'),
            'data' => [
                [
                    'label' => __('Involved'),
                    'value' => 0,
                ],
                [
                    'label' => __('Not involved'),
                    'value' => 0,
                ],
            ],
        ];
    }

    public function process(Collection $conversations): void
    {
        foreach ($conversations as $conversation) {
            if ($conversation->ai_agent_involved) {
                $this->report['data'][0]['value'] += 1;
            } else {
                $this->report['data'][1]['value'] += 1;
            }
        }
    }

    public function finalize(): array
    {
        $this->report['data'] = array_values($this->report['data']);
        return $this->report;
    }
}
