<?php

namespace App\Reports\Actions\ConversationsOverviewReport;

use Illuminate\Support\Str;

/**
 * Version platform report snapshots instead of scanning cached date-range keys.
 * Each support activity starts a new report generation without affecting
 * historical snapshots still held in the underlying cache store.
 */
class HelpdeskReportCache
{
    private const REVISION_KEY = 'helpdesk-platform-report-revision';

    public static function revision(): string
    {
        return (string) cache()->get(self::REVISION_KEY, '0');
    }

    public static function invalidate(): void
    {
        cache()->forever(self::REVISION_KEY, (string) Str::uuid());
    }
}
