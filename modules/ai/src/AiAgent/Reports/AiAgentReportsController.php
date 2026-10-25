<?php

namespace Ai\AiAgent\Reports;

use Ai\AiAgent\Reports\AiAgentConversationsReport;
use App\Reports\Actions\ConversationsOverviewReport\HelpdeskReports;
use Common\Core\BaseController;
use Common\Database\Metrics\MetricDateRange;

class AiAgentReportsController extends BaseController
{
    public function overview()
    {
        $this->authorize('show', 'helpdeskReport');

        $data = (new HelpdeskReports())
            ->registerPreset(
                'aiAgent',
                fn(MetricDateRange $dateRange) => [
                    new AiAgentConversationsReport($dateRange),
                    new AiAgentInvolvmentRateReport($dateRange),
                    new AiAgentInvolvmentOverTimeReport($dateRange),
                ],
            )
            ->build('aiAgent', request()->all());

        return $this->success($data);
    }
}
