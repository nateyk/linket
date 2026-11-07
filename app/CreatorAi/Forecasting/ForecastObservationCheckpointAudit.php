<?php

namespace App\CreatorAi\Forecasting;

use App\CreatorAi\Services\CreatorAiAccess;
use App\Models\User;
use Carbon\CarbonImmutable;
use DateTimeImmutable;
use DateTimeZone;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Read-only audit of proposed checkpoints from two local source projections.
 * Checks internal consistency, NEVER attests external authenticity or unlocks
 * revenue forecasts. No producer, public route or MCP tool exists.
 */
final class ForecastObservationCheckpointAudit
{
    private const SOURCES = [
        'checkout_event_stream',
        'verify_et_reconciliation',
    ];

    public function __construct(private readonly CreatorAiAccess $access) {}

    /**
     * @param list<array{date:string,verified_sales_count:int,verified_revenue_cents:int}> $daily
     * @return array<string,int|bool|string>
     */
    public function assess(User $creator, int $workspaceId, array $daily): array
    {
        // Reauthorize before reading any workspace's checkpoint metadata.
        $this->access->authorize($creator, $workspaceId, 'forecast');

        $count = count($daily);
        if ($count < 1 || $count > 366) {
            throw new InvalidArgumentException('Invalid number of checkpoint days.');
        }

        $previous = null;
        foreach ($daily as $row) {
            if (! is_array($row)
                || ! is_string($row['date'] ?? null)
                || preg_match('/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/D', $row['date']) !== 1
                || ! is_int($row['verified_sales_count'] ?? null)
                || ! is_int($row['verified_revenue_cents'] ?? null)
                || $row['verified_sales_count'] < 0
                || $row['verified_revenue_cents'] < 0
                || ($row['verified_sales_count'] === 0 && $row['verified_revenue_cents'] !== 0)) {
                throw new InvalidArgumentException('Invalid daily forecast reconciliation input.');
            }

            $day = DateTimeImmutable::createFromFormat('!Y-m-d', $row['date'], new DateTimeZone('UTC'));
            if (! $day || $day->format('Y-m-d') !== $row['date']
                || ($previous && $previous->modify('+1 day')->format('Y-m-d') !== $row['date'])) {
                throw new InvalidArgumentException('Invalid or incomplete checkpoint calendar.');
            }
            $previous = $day;
        }

        $meta = [
            'independent_observation_coverage_verified' => false,
            'checkpoint_days_requested' => $count,
            'locally_reconciled_checkpoint_days' => 0,
            'external_source_authenticity_verified' => false,
        ];

        $records = DB::table('creator_ai_forecast_coverage_checkpoints')
            ->where('workspace_id', $workspaceId)
            ->whereBetween('observed_on', [$daily[0]['date'], $daily[$count - 1]['date']])
            ->get([
                'observed_on', 'source_kind', 'verified_sales_count',
                'verified_gross_cents', 'source_cursor_sha256',
                'source_watermark_at', 'captured_at', 'sealed_at',
            ]);

        if ($records->isEmpty()) {
            return [...$meta, 'reason' => 'checkpoint_evidence_missing'];
        }

        $byDay = [];
        foreach ($records as $record) {
            if (! in_array($record->source_kind, self::SOURCES, true)) {
                return [...$meta, 'reason' => 'unknown_checkpoint_source'];
            }
            if (isset($byDay[$record->observed_on][$record->source_kind])) {
                return [...$meta, 'reason' => 'duplicate_checkpoint_source'];
            }
            $byDay[$record->observed_on][$record->source_kind] = $record;
        }

        $reconciledDays = 0;
        foreach ($daily as $row) {
            $day = $row['date'];
            $present = $byDay[$day] ?? [];
            if (count($present) < count(self::SOURCES)) {
                return [
                    ...$meta,
                    'locally_reconciled_checkpoint_days' => $reconciledDays,
                    'reason' => 'checkpoint_source_missing',
                ];
            }

            $cursors = [];
            foreach (self::SOURCES as $source) {
                $record = $present[$source] ?? null;
                if ($record === null) {
                    return [...$meta, 'reason' => 'checkpoint_source_missing'];
                }
                if (! is_string($record->source_cursor_sha256)
                    || preg_match('/^[a-f0-9]{64}$/D', $record->source_cursor_sha256) !== 1) {
                    return [...$meta, 'reason' => 'checkpoint_cursor_unverifiable'];
                }
                $cursors[] = $record->source_cursor_sha256;

                if ($record->sealed_at === null
                    || $record->captured_at === null
                    || $record->source_watermark_at === null) {
                    return [...$meta, 'reason' => 'checkpoint_not_sealed'];
                }

                $watermark = CarbonImmutable::parse($record->source_watermark_at, 'UTC');
                $captured = CarbonImmutable::parse($record->captured_at, 'UTC');
                $sealed = CarbonImmutable::parse($record->sealed_at, 'UTC');
                // A 48-hour grace period after the end of the UTC day.
                $earliest = CarbonImmutable::parse($day, 'UTC')->addDays(3)->startOfDay();
                if ($watermark->lessThan($earliest)
                    || $captured->lessThan($watermark)
                    || $sealed->lessThan($captured)
                    || $sealed->greaterThan(CarbonImmutable::now('UTC'))) {
                    return [...$meta, 'reason' => 'checkpoint_watermark_incomplete'];
                }

                if ((int) $record->verified_sales_count !== $row['verified_sales_count']
                    || (int) $record->verified_gross_cents !== $row['verified_revenue_cents']) {
                    return [...$meta, 'reason' => 'checkpoint_aggregate_mismatch'];
                }
            }

            if (count(array_unique($cursors)) !== count(self::SOURCES)) {
                return [...$meta, 'reason' => 'checkpoint_source_cursor_collision'];
            }

            $reconciledDays++;
        }

        // No signature checks or source-writer provenance yet. NEVER true.
        return [
            ...$meta,
            'locally_reconciled_checkpoint_days' => $reconciledDays,
            'reason' => 'checkpoint_lineage_not_independently_attested',
        ];
    }
}
