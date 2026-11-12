<?php

namespace Database\Seeders;

use Common\Localizations\Localization;
use Common\Localizations\LocalizationsRepository;
use Illuminate\Database\Seeder;
use RuntimeException;

/**
 * Install core Amharic UI strings while preserving admin-edited translations.
 *
 * Versioned source: resources/amharic-translations.json.
 * Mutable runtime copy: resources/lang/am.json.
 */
class AmharicLocalizationSeeder extends Seeder
{
    public function run(): void
    {
        $repository = app(LocalizationsRepository::class);
        $localization = $this->ensureLocale();
        $merged = $this->mergeLines(
            $repository->getDefaultTranslationLines(),
            $repository->getLocalizationLines($localization),
            $this->readCatalog(),
        );

        if ($repository->storeLocalizationLines($localization, $merged, true) === false) {
            throw new RuntimeException('Unable to save Amharic localization lines.');
        }
    }

    private function ensureLocale(): Localization
    {
        return Localization::query()->firstOrCreate(
            ['language' => 'am'],
            ['name' => 'አማርኛ', 'direction' => 'ltr'],
        );
    }

    private function readCatalog(): array
    {
        $catalog = json_decode(
            file_get_contents(resource_path('amharic-translations.json')),
            true,
            512,
            JSON_THROW_ON_ERROR,
        );

        if (!is_array($catalog)) {
            throw new RuntimeException('The Amharic translation catalog must be a JSON object.');
        }

        return $catalog;
    }

    private function mergeLines(
        array $defaults,
        array $existing,
        array $catalog,
    ): array {
        $merged = array_merge($defaults, $existing);

        foreach ($catalog as $source => $translation) {
            if ($this->isDefaultTranslation($source, $existing, $defaults)) {
                $merged[$source] = $translation;
            }
        }

        return $merged;
    }

    private function isDefaultTranslation(
        string $source,
        array $existing,
        array $defaults,
    ): bool {
        // A translation matching the English source is not a custom edit.
        return !isset($existing[$source])
            || $existing[$source] === $source
            || $existing[$source] === ($defaults[$source] ?? $source);
    }
}
