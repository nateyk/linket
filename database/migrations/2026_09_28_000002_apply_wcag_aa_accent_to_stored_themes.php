<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * config/themes.php is the source of truth for the site theme, but the rendered
 * CSS variables are served from the css_themes rows (BaseBootstrapData::setCssThemes
 * only falls back to config when the table is empty), and migrations that already
 * ran do not re-run.
 *
 * WCAG AA (4.5:1) fails on the old light-mode accent in both directions:
 *   --be-primary on white 3.76:1, #fcfcfc on --be-primary 3.67:1,
 *   text-primary on bg-primary/10 3.34:1, login promo copy 2.89:1.
 * The accent was darkened on the same hue (259.815) to a relative luminance of
 * 0.1044, which clears 4.5:1 in both directions and against the 10% tint and the
 * 80%-opacity hover fill. This migration brings the stored row in line with it.
 *
 * The dark-mode accent (oklch(88.2% 0.059 254.128)) already measures 13.92:1 on
 * the dark ground and is deliberately left untouched.
 */
return new class extends Migration
{
    private const OLD_PRIMARY = 'oklch(62.3% 0.214 259.815)';

    private const NEW_PRIMARY = 'oklch(46% 0.214 259.815)';

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
            if (!is_array($values) || ($values['--be-primary'] ?? null) !== self::OLD_PRIMARY) {
                continue;
            }

            $values['--be-primary'] = self::NEW_PRIMARY;

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
            if (!is_array($values) || ($values['--be-primary'] ?? null) !== self::NEW_PRIMARY) {
                continue;
            }

            $values['--be-primary'] = self::OLD_PRIMARY;

            DB::table('css_themes')
                ->where('id', $theme->id)
                ->update([
                    'values' => json_encode($values),
                    'updated_at' => now(),
                ]);
        }
    }
};
