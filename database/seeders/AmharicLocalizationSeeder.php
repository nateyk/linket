<?php

namespace Database\Seeders;

use Common\Localizations\Localization;
use Common\Localizations\LocalizationsRepository;
use Illuminate\Database\Seeder;
use RuntimeException;

/**
 * Register the Ethiopian Amharic UI locale without replacing edited translations.
 *
 * The source catalog is versioned separately from the mutable resources/lang/am.json
 * file. Fresh installs get translated labels; repeated seeds preserve manual edits.
 */
class AmharicLocalizationSeeder extends Seeder
{
    public function run(): void
    {
        $repository = app(LocalizationsRepository::class);
        $catalog = json_decode(
            file_get_contents(resource_path('amharic-translations.json')),
            true,
            512,
            JSON_THROW_ON_ERROR,
        );

        if (!is_array($catalog)) {
            throw new RuntimeException('The Amharic translation catalog must be a JSON object.');
        }

        $localization = Localization::query()->firstOrCreate(
            ['language' => 'am'],
            ['name' => 'አማርኛ', 'direction' => 'ltr'],
        );

        $defaults = $repository->getDefaultTranslationLines();
        $existing = $repository->getLocalizationLines($localization);
        $merged = array_merge($defaults, $existing);

        foreach ($catalog as $source => $translation) {
            // Do not overwrite a genuine admin-edited translation. Initial
            // English copies from a prior localization creation are replaced.
            if (
                !isset($existing[$source]) ||
                $existing[$source] === $source ||
                $existing[$source] === ($defaults[$source] ?? $source)
            ) {
                $merged[$source] = $translation;
            }
        }

        if ($repository->storeLocalizationLines($localization, $merged, true) === false) {
            throw new RuntimeException('Unable to save Amharic localization lines.');
        }
    }
}
