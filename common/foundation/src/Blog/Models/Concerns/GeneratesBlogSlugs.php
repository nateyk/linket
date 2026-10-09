<?php

namespace Common\Blog\Models\Concerns;

use Illuminate\Support\Str;

/**
 * Slug generation for blog articles and categories.
 *
 * Transliterates before slugging because Str::slug drops characters it does
 * not recognise, which turns a German title into an empty slug and a CJK or
 * emoji-only title into the empty string — both unusable as unique URL keys.
 */
trait GeneratesBlogSlugs
{
    /**
     * Characters that would otherwise be dropped entirely. Ported from the
     * marketbob reference (App\Methods\SlugTranslation).
     */
    protected static array $transliterations = [
        'ä' => 'ae',
        'ö' => 'oe',
        'ü' => 'ue',
        'Ä' => 'Ae',
        'Ö' => 'Oe',
        'Ü' => 'Ue',
        'ß' => 'ss',
        'ẞ' => 'SS',
        'æ' => 'ae',
        'Æ' => 'AE',
        'œ' => 'oe',
        'Œ' => 'OE',
        'ø' => 'o',
        'Ø' => 'O',
        'å' => 'a',
        'Å' => 'A',
        'đ' => 'd',
        'Đ' => 'D',
        'ł' => 'l',
        'Ł' => 'L',
        'þ' => 'th',
        'Þ' => 'Th',
        'ð' => 'd',
        'Ð' => 'D',
        'İ' => 'i',
        'ı' => 'i',
        'Ő' => 'o',
        'ő' => 'o',
        'Ű' => 'u',
        'ű' => 'u',
    ];

    public static function transliterate(string $value): string
    {
        return mb_strtolower(
            strtr($value, static::$transliterations),
        );
    }

    public static function generateUniqueBlogSlug(
        string $source,
        string $column,
        int|null $ignoreId = null,
    ): string {
        $base = Str::slug(static::transliterate($source));

        // Nothing survived slugging (CJK, emoji, punctuation only). Fall back
        // to a hash of the source so the row still gets a unique, stable key.
        if ($base === '') {
            $base = 'item-'.substr(md5($source), 0, 8);
        }

        $slug = $base;
        $counter = 2;

        while (
            static::query()
                ->where($column, $slug)
                ->when(
                    $ignoreId !== null,
                    fn ($query) => $query->where('id', '!=', $ignoreId),
                )
                ->exists()
        ) {
            $slug = "{$base}-{$counter}";
            $counter++;
        }

        return $slug;
    }
}