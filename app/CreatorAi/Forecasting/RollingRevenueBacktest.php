<?php

namespace App\CreatorAi\Forecasting;

use InvalidArgumentException;

/** Multi-fold chronological evaluation; no model calls and no lookahead. */
final class RollingRevenueBacktest
{
    /**
     * @param list<array{verified_revenue_cents:int}> $daily
     * @return array{fold_count:int,candidate_mae_cents:int,naive_mae_cents:int,all_folds_pass:bool}
     */
    public function evaluate(array $daily, int $horizonDays): array
    {
        if (! in_array($horizonDays, [7, 30], true) || count($daily) < 2 * $horizonDays + 14) {
            throw new InvalidArgumentException('At least two chronological holdouts require adequate data.');
        }
        $folds = 0;
        $candidateError = 0;
        $naiveError = 0;
        $allPass = true;
        for ($foldIndex = 0; $foldIndex < 3; $foldIndex++) {
            $split = count($daily) - ($foldIndex + 1) * $horizonDays;
            if ($split < 14) {
                break;
            }
            $lastSeven = array_slice($daily, $split - 7, 7);
            $candidate = intdiv(array_sum(array_column($lastSeven, 'verified_revenue_cents')) + 3, 7);
            $naive = $daily[$split - 1]['verified_revenue_cents'];
            $candidateFoldError = 0;
            $naiveFoldError = 0;
            foreach (array_slice($daily, $split, $horizonDays) as $row) {
                $candidateFoldError += abs($row['verified_revenue_cents'] - $candidate);
                $naiveFoldError += abs($row['verified_revenue_cents'] - $naive);
            }
            $folds++;
            $candidateError += $candidateFoldError;
            $naiveError += $naiveFoldError;
            $allPass = $allPass && $candidateFoldError <= $naiveFoldError;
        }
        if ($folds < 2) {
            throw new InvalidArgumentException('Insufficient independent backtest folds.');
        }
        $observations = $folds * $horizonDays;
        return [
            'fold_count' => $folds,
            'candidate_mae_cents' => intdiv($candidateError + $observations - 1, $observations),
            'naive_mae_cents' => intdiv($naiveError + $observations - 1, $observations),
            'all_folds_pass' => $allPass,
        ];
    }
}
