<?php

namespace App\Payments\VerifyEt;

final class EthiopianNameNormalizer
{
    public function stripHonorifics(string $name): string
    {
        return trim((string) preg_replace('/\b(?:ato|w\/ro|w\/rt|dr\.?|eng\.?|engineer|sheikh)\b\.?/iu', ' ', $name));
    }

    /** @return list<string> */
    public function normalizeTokens(string $name): array
    {
        $clean = mb_strtolower($this->stripHonorifics($name));
        $clean = (string) preg_replace('/[^\p{L}\p{N}]+/u', ' ', $clean);
        $tokens = preg_split('/\s+/u', trim($clean)) ?: [];

        return array_values(array_unique(array_filter($tokens)));
    }

    /** @param list<string> $approvedAliases */
    public function matches(string $nameA, string $nameB, array $approvedAliases = []): bool
    {
        $a = $this->normalizeTokens($nameA);
        $b = $this->normalizeTokens($nameB);
        if (count($a) >= 2 && count($b) >= 2 && in_array($a[0], $b, true) && in_array($a[count($a) - 1], $b, true)) {
            return true;
        }

        foreach ($approvedAliases as $alias) {
            if ($this->normalizeTokens($alias) === $b) {
                return true;
            }
        }

        return false;
    }
}
