<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * DESIGN.md (Shapes) pins one radius family with three members: controls and
 * cards 24px, badges 16px, fields 12px — "Only 24px, 16px and 12px exist,"
 * with fields softer than buttons "so an input never reads as a button."
 *
 * framework.blade.php renders `radius-{CssTheme.radius}` onto <html>, and the
 * numbers come from that class alone. `radius-default` is the fall-through:
 * no `.radius-*` block matches, so common-tailwind.css keeps
 * --radius-input/button/card = var(--radius-xl/-3xl/-3xl) = 12/24/24px and
 * --radius-card-sm = var(--radius-2xl) = 16px — exactly DESIGN.md.
 * The `.radius-sm` class the stored rows carried instead maps button *and*
 * input to var(--radius-md) (6px) and cards to var(--radius-lg) (8px), so an
 * input read as a button.
 *
 * The column default is already 'default'
 * (2026_04_24_115029_add_radius_column_to_css_themes_table.php) and fresh
 * installs inherit it, but the installed site rows were saved at 'sm' and
 * migrations that already ran do not re-run. This migration brings the stored
 * rows back to `default`. The `.radius-sm` block itself is untouched — it
 * remains a legitimate theme option; we simply stop selecting it.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!DB::getSchemaBuilder()->hasTable('css_themes')) {
            return;
        }

        DB::table('css_themes')
            ->where('type', 'site')
            ->where(function ($query) {
                $query
                    ->whereNull('radius')
                    ->orWhere('radius', '!=', 'default');
            })
            ->update([
                'radius' => 'default',
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        // Irreversible — the previous per-row roundness was an arbitrary
        // choice that DESIGN.md's Three-Radius Rule forbids.
    }
};
