<?php namespace App\Reports\Controllers;

use App\Reports\Actions\ConversationsOverviewReport\HelpdeskReports;
use App\Reports\Actions\HelpCenterSearchReport;
use App\Reports\Actions\PopularArticlesReport;
use Common\Core\BaseController;
use Common\Database\Metrics\MetricDateRange;

class HelpdeskReportsController extends BaseController
{
    public function articles()
    {
        $this->authorize('show', 'helpdeskReport');

        $pagination = (new PopularArticlesReport())->generate(request()->all());

        return $this->success(['pagination' => $pagination]);
    }

    public function search(string $type = 'popular')
    {
        $this->authorize('show', 'helpdeskReport');

        $dateRange =
            request('startDate') && request('endDate')
                ? new MetricDateRange(
                    start: request('startDate'),
                    end: request('endDate'),
                    timezone: request('timezone'),
                )
                : null;

        $pagination = (new HelpCenterSearchReport($dateRange))->generate(
            $type,
            request()->all(),
        );

        return $this->success(['pagination' => $pagination]);
    }

    public function conversations(string $modelType)
    {
        $this->authorize('show', 'helpdeskReport');

        $data = (new HelpdeskReports($modelType))->all(request()->all());

        return $this->success($data);
    }

    public function agents()
    {
        $this->authorize('show', 'helpdeskReport');

        $data = (new HelpdeskReports())->agents(request()->all());

        return $this->success($data);
    }

    public function tags()
    {
        $this->authorize('show', 'helpdeskReport');

        $data = (new HelpdeskReports())->tags(request()->all());

        return $this->success($data);
    }
}
