<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Consolidate scattered financial sidebar menus (payment gateways, receiving accounts,
 * withdrawals, payment activity) into a single top-level Financial hub entry.
 */
return new class extends Migration
{
    private const FINANCIAL_ACTION = '/admin/financial';

    private const FINANCIAL_ID = 'admin-financial';

    /** @var list<string> */
    private const OBSOLETE_ACTIONS = [
        '/admin/financial/payment-gateways',
        '/admin/financial/withdrawal-methods',
        '/admin/withdrawals',
        '/admin/payment-activity',
    ];

    /** @var list<string> */
    private const OBSOLETE_IDS = [
        'admin-payment-gateways',
        'admin-withdrawal-methods',
        'admin-withdrawals',
        'admin-payment-activity',
    ];

    public function up(): void
    {
        $setting = DB::table('settings')->where('name', 'menus')->first();
        $menus = json_decode($setting?->value ?? '', true);
        if (! is_array($menus)) {
            return;
        }

        $changed = false;
        foreach ($menus as &$menu) {
            if (! in_array('admin-sidebar', $menu['positions'] ?? [], true)) {
                continue;
            }

            $items = $menu['items'] ?? [];
            $insertionIndex = $this->determineInsertionIndex($items);

            $filtered = [];
            foreach ($items as $item) {
                $action = $item['action'] ?? null;
                $id = $item['id'] ?? null;
                if (in_array($action, self::OBSOLETE_ACTIONS, true) || in_array($id, self::OBSOLETE_IDS, true)) {
                    $changed = true;
                    continue;
                }
                $filtered[] = $item;
            }

            if (! $this->hasFinancialItem($filtered)) {
                $financialItem = [
                    'id' => self::FINANCIAL_ID,
                    'label' => 'Financial',
                    'action' => self::FINANCIAL_ACTION,
                    'type' => 'route',
                    'permissions' => ['admin.access'],
                ];

                $targetIndex = min($insertionIndex, count($filtered));
                array_splice($filtered, $targetIndex, 0, [$financialItem]);
                $changed = true;
            }

            foreach ($filtered as $index => &$item) {
                $item['order'] = $index;
            }
            unset($item);

            $menu['items'] = $filtered;
        }
        unset($menu);

        if ($changed) {
            DB::table('settings')->where('name', 'menus')->update([
                'value' => json_encode($menus, JSON_UNESCAPED_SLASHES),
                'updated_at' => now(),
            ]);
            Cache::forget('settings.public');
        }
    }

    private function hasFinancialItem(array $items): bool
    {
        foreach ($items as $item) {
            if (($item['id'] ?? null) === self::FINANCIAL_ID
                || ($item['action'] ?? null) === self::FINANCIAL_ACTION
                || ($item['action'] ?? null) === '/admin/financial/general') {
                return true;
            }
        }

        return false;
    }

    private function determineInsertionIndex(array $items): int
    {
        // 1. Prefer the position of the first obsolete financial item if present.
        foreach ($items as $index => $item) {
            $action = $item['action'] ?? null;
            $id = $item['id'] ?? null;
            if (in_array($action, self::OBSOLETE_ACTIONS, true) || in_array($id, self::OBSOLETE_IDS, true)) {
                return $index;
            }
        }

        // 2. Next prefer right after items/digital-products.
        foreach ($items as $index => $item) {
            if (($item['id'] ?? null) === 'digital-products-admin'
                || ($item['action'] ?? null) === '/admin/items'
                || ($item['action'] ?? null) === '/admin/digital-products') {
                return $index + 1;
            }
        }

        // 3. Next prefer right before KYC verifications.
        foreach ($items as $index => $item) {
            if (($item['id'] ?? null) === 'admin-kyc-verifications'
                || ($item['action'] ?? null) === '/admin/kyc-verifications') {
                return $index;
            }
        }

        return count($items);
    }

    public function down(): void
    {
        // Leave customized navigation intact; rolling back a deployment must
        // not disrupt custom menu configurations.
    }
};
