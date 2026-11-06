<?php

namespace App\CreatorAi\Writing;

use Illuminate\Validation\ValidationException;

/**
 * Provider output is untrusted, including when the JSON schema was honored.
 * Return plain text only, with conservative lengths for existing editors.
 */
final class ProductCopyDraftValidator
{
    /**
     * @param array<string,mixed> $candidate
     * @return array{title:string,description:string}
     */
    public function clean(array $candidate): array
    {
        if (array_keys($candidate) !== ['title', 'description']
            || ! is_string($candidate['title']) || ! is_string($candidate['description'])) {
            throw ValidationException::withMessages([
                'draft' => 'AI returned an unsupported product-copy format.',
            ]);
        }

        $title = $this->normalize($candidate['title'], 160);
        $description = $this->normalize($candidate['description'], 5000);

        if ($title === '' || $description === '') {
            throw ValidationException::withMessages(['draft' => 'AI returned incomplete product copy.']);
        }

        $combined = $title."\n".$description;
        if (preg_match(
            '/\b(guaranteed?\s+(?:earnings?|income|sales|results)|100%\s+(?:success|guaranteed)|risk[- ]free|officially\s+certified)\b/iu',
            $combined
        ) === 1) {
            throw ValidationException::withMessages([
                'draft' => 'AI suggested an unverified promotional claim.',
            ]);
        }

        return ['title' => $title, 'description' => $description];
    }

    private function normalize(string $value, int $limit): string
    {
        if (! mb_check_encoding($value, 'UTF-8')
            || preg_match('/<[^>]*>|https?:\/\/|(?:javascript|data):/iu', $value) === 1) {
            throw ValidationException::withMessages([
                'draft' => 'AI draft contains unsafe HTML or links.',
            ]);
        }

        $clean = trim(preg_replace('/[\x{0000}-\x{001F}\x{007F}]/u', ' ', $value) ?? '');
        $clean = preg_replace('/\s{2,}/u', ' ', $clean) ?? '';

        if (mb_strlen($clean) > $limit) {
            throw ValidationException::withMessages([
                'draft' => 'AI draft exceeds the editor character limit.',
            ]);
        }

        return $clean;
    }
}
