# SF-12 — Install and verify real Amharic interface translations

Amharic (`am`, left-to-right) uses the existing Linket localization store, `<Trans>` and `useTrans` UI components. The versioned `resources/amharic-translations.json` catalog translates core storefront, product/checkout, service/inquiry and store/service builder messages. Seller-authored descriptions and names remain the seller's own text. Strings absent from this catalog fall back to English until separately translated.

## Installation and upgrade

On a fresh install, the standard `php artisan db:seed` now installs both English and Amharic and writes `resources/lang/am.json`. On **existing installations**, run the following after deploying the code:

```bash
php artisan db:seed --class='Common\Database\Seeders\LocalizationsTableSeeder' --force
php artisan db:seed --class='Database\Seeders\AmharicLocalizationSeeder' --force
```

If the admin has switched off **Settings → Localization → Enable translations**, turn it on; the code deliberately does not override administrator settings or silently change the default language. The footer/account language switcher can then select **አማርኛ**. Explicit `?lang=am` also selects the locale for a request. Changes to the selected language are stored for signed-in users or in a cookie for guests.

## Technical verification

1. Confirm `localizations.language = 'am'` with `direction = 'ltr'`, and `resources/lang/am.json` has translated `Products`, `Get for free`, `Request a quote` and `Save changes`.
2. On **nonproduction** published storefront, product and service routes, select **አማርኛ** and verify the actual UI changes, not merely seller-supplied Amharic content. Check navigation, checkout (without purchasing) and inquiry validation (without submitting).
3. In an authenticated builder, switch the locale, inspect Content/Appearance/Save, creator profile and service steps; ensure Save/reload/published states stay correct.
4. Check dynamic `:price`, `:count`, `:package`, `:current`, `:total` placeholders, long strings and phone widths.
5. Record browser and OS, exact SHA, screenshots, and observations in GitHub issue #172. Translation coverage is **partial**, not a claim of complete multilingual AA or human screen-reader signoff.

Admin-edited translations are preserved on subsequent seed runs. Native 200% toolbar zoom, NVDA/VoiceOver and release approval remain independent manual acceptance steps.

## Staging installation and read-only verification — operator-run

**This must be run by someone with approved staging shell access.** GitHub source changes and CI are not evidence that the deployed staging database contains the locale. Do not run any of these commands on production; do not run an unscoped full `db:seed` on an existing environment.

Confirm the server is the intended nonproduction Linket staging installation, the deployed full SHA matches the source under test, and the PHP user has permission to update `resources/lang/am.json`. Back up an existing file before seeding:

```bash
cd "$HOME/linket-staging"
php artisan about --only=environment
git rev-parse HEAD
test -f resources/lang/am.json && cp -p resources/lang/am.json resources/lang/am.json.before-sf12 || true
php artisan db:seed --class='Database\Seeders\AmharicLocalizationSeeder' --force
php artisan optimize:clear
php -r 'require "vendor/autoload.php"; $app=require "bootstrap/app.php"; $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap(); $locale=Common\Localizations\Localization::where("language","am")->first(); $lines=$locale ? app(Common\Localizations\LocalizationsRepository::class)->getLocalizationLines($locale) : []; echo json_encode(["environment"=>app()->environment(),"installed"=>(bool)$locale,"direction"=>$locale?->direction,"line_count"=>count($lines),"products"=>$lines["Products"]??null,"appearance"=>$lines["Appearance"]??null],JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT),PHP_EOL;'
```

Expected: `installed=true`, `direction=ltr`, and actual Amharic text in the `Products` and `Appearance` fields. Confirm `i18n.enable` is on in staging settings, then verify an **actual staging** storefront, product, service and authenticated builder with `?lang=am`. Record UI text and locale-switching screenshots, not merely Amharic seller-authored descriptions. No payment, purchase or real inquiry submission.

The source catalog now targets **319 curated messages** in core journeys, not every screen in Linket. A native Amharic speaker should review wording, wrapping, fonts and interactive behavior before the language acceptance gate is signed. This operator runbook does not mean installation or human verification has already happened.
