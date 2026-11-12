<?php

use Common\Core\Middleware\SetAppLocale;
use Common\Database\Seeders\LocalizationsTableSeeder;
use Common\Localizations\Localization;
use Common\Localizations\LocalizationsRepository;
use Database\Seeders\AmharicLocalizationSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\Request;

uses(DatabaseTransactions::class);

test('Amharic locale is installed, translates actual storefront and builder keys, and preserves edits on reseed', function () {
    // Localization lines are disk-backed. Restore the file to avoid leaking
    // state into other tests or changing an existing installation's catalog.
    $path = resource_path('lang/am.json');
    $previous = is_file($path) ? file_get_contents($path) : null;
    if (is_file($path)) {
        unlink($path);
    }

    try {
        Localization::query()->where('language', 'am')->delete();
        $this->seed(LocalizationsTableSeeder::class);
        $this->seed(AmharicLocalizationSeeder::class);

        $locale = Localization::query()->where('language', 'am')->firstOrFail();
        expect($locale->name)->toBe('አማርኛ');
        expect($locale->direction)->toBe('ltr');
        expect(Localization::query()->where('language', 'am')->count())->toBe(1);

        $repository = app(LocalizationsRepository::class);
        $lines = $repository->getByNameOrCode('am')->lines;
        expect($lines['Products'])->toBe('ምርቶች');
        expect($lines['Get for free'])->toBe('በነፃ ያግኙ');
        expect($lines['Request a quote'])->toBe('የዋጋ ጥያቄ ያቅርቡ');
        expect($lines['Save changes'])->toBe('ለውጦችን አስቀምጥ');
        expect($lines['Step :current of :total'])->toContain(':current', ':total');
        expect($lines['From :price'])->toContain(':price');

        $lines['Save changes'] = 'የራሴ ትርጉም';
        $repository->storeLocalizationLines($locale, $lines, true);
        $this->seed(AmharicLocalizationSeeder::class);
        $this->seed(AmharicLocalizationSeeder::class);

        $updated = $repository->getByNameOrCode('am')->lines;
        expect($updated['Save changes'])->toBe('የራሴ ትርጉም');
        expect($updated['Services'])->toBe('አገልግሎቶች');
        expect(Localization::query()->where('language', 'am')->count())->toBe(1);
        expect(SetAppLocale::resolveLanguageFromRequest(Request::create('/?lang=am')))->toBe('am');
    } finally {
        if ($previous === null) {
            if (is_file($path)) {
                unlink($path);
            }
        } else {
            file_put_contents($path, $previous);
        }
    }
});

test('all curated Amharic translations are nonempty and retain source placeholders', function () {
    $catalog = json_decode(file_get_contents(resource_path('amharic-translations.json')), true, 512, JSON_THROW_ON_ERROR);
    expect(count($catalog))->toBeGreaterThan(100);

    foreach ($catalog as $source => $translation) {
        expect($source)->toBeString()->not->toBeEmpty();
        expect($translation)->toBeString()->not->toBeEmpty();
        expect($translation)->not->toBe($source);
        preg_match_all('/:([a-zA-Z_][a-zA-Z0-9_]*)/', $source, $sourcePlaceholders);
        preg_match_all('/:([a-zA-Z_][a-zA-Z0-9_]*)/', $translation, $translatedPlaceholders);
        sort($sourcePlaceholders[1]);
        sort($translatedPlaceholders[1]);
        expect($translatedPlaceholders[1])->toBe($sourcePlaceholders[1]);
    }
});
