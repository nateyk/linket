<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * The items-route rename removed /dashboard/my-products from the SPA.
 * Menus live in the settings table (row name='menus', JSON blob); every
 * desktop (dashboard-primary), mobile (dashboard-mobile), and user-created
 * menu whose item action still points at the old path 404s. Rewrite the
 * action value everywhere, mirroring the JSON-walk pattern of
 * 2026_08_16_000001_rename_digital_products_menu_label.
 *
 * The same rename moved the admin SPA route /admin/digital-products to
 * /admin/items, so old installs' admin-sidebar rows carry a dead link
 * there too; those actions are rewritten in the same walk.
 */
return new class extends Migration
{
    private const FROM = '/dashboard/my-products';

    private const TO = '/dashboard/items';

    private const ADMIN_FROM = '/admin/digital-products';

    private const ADMIN_TO = '/admin/items';

    public function up(): void
    {
        $this->rewriteActions(self::FROM, self::TO);
        $this->rewriteActions(self::ADMIN_FROM, self::ADMIN_TO);

        // Menus are read through settings()->loadSettings(), which caches the
        // whole settings table under "settings.public" for 24h. Purge it so the
        // rewritten actions are served immediately instead of the stale blob.
        Cache::forget('settings.public');
    }

    public function down(): void
    {
        $this->rewriteActions(self::TO, self::FROM);
        $this->rewriteActions(self::ADMIN_TO, self::ADMIN_FROM);

        Cache::forget('settings.public');
    }

    private function rewriteActions(string $from, string $to): void
    {
        $setting = DB::table('settings')->where('name', 'menus')->first();
        if (!$setting) {
            return;
        }

        $menus = json_decode($setting->value, true);
        if (!is_array($menus)) {
            return;
        }

        $changed = false;

        foreach ($menus as &$menu) {
            if (!isset($menu['items']) || !is_array($menu['items'])) {
                continue;
            }

            foreach ($menu['items'] as &$item) {
                $action = str_replace('\\/', '/', $item['action'] ?? '');
                if ($action === $from) {
                    $item['action'] = $to;
                    $changed = true;
                }
            }
            unset($item);
        }
        unset($menu);

        if ($changed) {
            DB::table('settings')
                ->where('name', 'menus')
                ->update(['value' => json_encode($menus)]);
        }
    }
};
