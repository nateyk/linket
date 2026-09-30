<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * config/themes.php is the source of truth for the site theme, but the rendered
 * CSS variables are served from the css_themes rows (BaseBootstrapData::setCssThemes
 * only falls back to config when the table is empty), and migrations that already
 * ran do not re-run.
 *
 * The destructive token ("Alarm Red") was re-locked on the same hues to clear
 * WCAG AA (4.5:1) in both schemes:
 *   light: oklch(0.6532 0.2328 25.74) -> oklch(0.46 0.187 25.74)
 *   dark:  oklch(0.594 0.1967 24.63)  -> oklch(0.77 0.136 24.63)
 *
 * Light and dark values live in SEPARATE css_themes rows (distinguished by the
 * default_light / default_dark flags), each holding the "--be-destructive" key
 * in its "values" JSON. This migration updates each stored row that still holds
 * an old destructive value to the new locked one. Rows with any other value
 * (e.g. custom themes) are left untouched.
 */
return new class extends Migration
{
    private const OLD_DESTRUCTIVE_LIGHT = 'oklch(0.6532 0.2328 25.74)';

    private const NEW_DESTRUCTIVE_LIGHT = 'oklch(0.46 0.187 25.74)';

    private const OLD_DESTRUCTIVE_DARK = 'oklch(0.594 0.1967 24.63)';

    private const NEW_DESTRUCTIVE_DARK = 'oklch(0.77 0.136 24.63)';

    public function up(): void
    {
        if (!DB::getSchemaBuilder()->hasTable('css_themes')) {
            return;
        }

        $themes = DB::table('css_themes')
            ->where('type', 'site')
            ->get();

        foreach ($themes as $theme) {
            $values = json_decode($theme->values ?? '', true);
            if (!is_array($values)) {
                continue;
            }

            $changed = false;

            if (
                ($values['--be-destructive'] ?? null) ===
                self::OLD_DESTRUCTIVE_LIGHT
            ) {
                $values['--be-destructive'] = self::NEW_DESTRUCTIVE_LIGHT;
                $changed = true;
            }

            if (
                ($values['--be-destructive'] ?? null) ===
                self::OLD_DESTRUCTIVE_DARK
            ) {
                $values['--be-destructive'] = self::NEW_DESTRUCTIVE_DARK;
                $changed = true;
            }

            if (!$changed) {
                continue;
            }

            DB::table('css_themes')
                ->where('id', $theme->id)
                ->update([
                    'values' => json_encode($values),
                    'updated_at' => now(),
                ]);
        }
    }

    public function down(): void
    {
        if (!DB::getSchemaBuilder()->hasTable('css_themes')) {
            return;
        }

        $themes = DB::table('css_themes')
            ->where('type', 'site')
            ->get();

        foreach ($themes as $theme) {
            $values = json_decode($theme->values ?? '', true);
            if (!is_array($values)) {
                continue;
            }

            $changed = false;

            if (
                ($values['--be-destructive'] ?? null) ===
                self::NEW_DESTRUCTIVE_LIGHT
            ) {
                $values['--be-destructive'] = self::OLD_DESTRUCTIVE_LIGHT;
                $changed = true;
            }

            if (
                ($values['--be-destructive'] ?? null) ===
                self::NEW_DESTRUCTIVE_DARK
            ) {
                $values['--be-destructive'] = self::OLD_DESTRUCTIVE_DARK;
                $changed = true;
            }

            if (!$changed) {
                continue;
            }

            DB::table('css_themes')
                ->where('id', $theme->id)
                ->update([
                    'values' => json_encode($values),
                    'updated_at' => now(),
                ]);
        }
    }
};
