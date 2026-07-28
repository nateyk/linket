<?php

namespace App\Actions\Admin;

use Common\Admin\Analytics\Actions\BuildAnalyticsReport;
use Common\Admin\Analytics\Actions\BuildDemoAnalyticsReport;
use Common\Admin\Analytics\Actions\BuildGoogleAnalyticsReport;
use Common\Admin\Analytics\Actions\BuildNullAnalyticsReport;
use Exception;
use Illuminate\Support\Str;

class BuildAppAnalyticsReport extends BuildAnalyticsReport
{
    public function execute(): array
    {
        if (config('app.demo')) {
            return app(BuildDemoAnalyticsReport::class)->execute($params);
        } else {
            return $this->getGoogleAnalyticsData()->execute($params);
        }
    }

    private function getGoogleAnalyticsData()
    {
        try {
            return app(BuildGoogleAnalyticsReport::class);
        } catch (Exception $e) {
            // don't pollute logs with useless errors if
            // user did not set up Google Analytics yet
            if (
                Str::contains(
                    $e->getMessage(),
                    "Can't find the .p12 certificate",
                )
            ) {
                return new BuildNullAnalyticsReport([]);
            } else {
                throw $e;
            }
        }
    }
}
