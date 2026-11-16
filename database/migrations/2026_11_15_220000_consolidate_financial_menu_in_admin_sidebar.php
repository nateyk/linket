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

    public function up(): void
    {
        $setting = DB::table('settings')->where('name', 'menus')->first();
        $menus = json_decode($setting?->value ?? '', true);
        if (! is_array($menus)) {
            return;
        }

        $changed = false;
        foreach ($menus as &$menu) {
            if ($this->isTargetMenu($menu)) {
                $menu['items'] = $this->consolidateItems($menu['items'] ?? []);
                $changed = true;
            }
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

    private function isTargetMenu(array $menu): bool
    {
        return in_array('admin-sidebar', $menu['positions'] ?? [], true);
    }

    private function consolidateItems(array $items): array
    {
        $targetIndex = $this->findInsertionIndex($items);
        $cleanItems = array_values(array_filter($items, fn (array $item): bool => ! $this->isObsolete($item)));

        if (! $this->hasFinancialItem($cleanItems)) {
            $insertAt = min($targetIndex, count($cleanItems));
            array_splice($cleanItems, $insertAt, 0, [$this->financialItem()]);
        }

        return $this->reindexOrders($cleanItems);
    }

    private function isObsolete(array $item): bool
    {
        $action = $item['action'] ?? '';
        $id = $item['id'] ?? '';

        return match ($action) {
            '/admin/financial/payment-gateways',
            '/admin/financial/withdrawal-methods',
            '/admin/withdrawals',
            '/admin/payment-activity' => true,
            default => match ($id) {
                'admin-payment-gateways',
                'admin-withdrawal-methods',
                'admin-withdrawals',
                'admin-payment-activity' => true,
                default => false,
            },
        };
    }

    private function findInsertionIndex(array $items): int
    {
        foreach ($items as $index => $item) {
            if ($this->isObsolete($item)) {
                return $index;
            }
        }

        foreach ($items as $index => $item) {
            $action = $item['action'] ?? '';
            if ($action === '/admin/items' || $action === '/admin/digital-products') {
                return $index + 1;
            }
        }

        return count($items);
    }

    private function hasFinancialItem(array $items): bool
    {
        foreach ($items as $item) {
            $action = $item['action'] ?? '';
            $id = $item['id'] ?? '';
            if ($id === self::FINANCIAL_ID || $action === self::FINANCIAL_ACTION || $action === '/admin/financial/general') {
                return true;
            }
        }

        return false;
    }

    private function financialItem(): array
    {
        return [
            'id' => self::FINANCIAL_ID,
            'label' => 'Financial',
            'action' => self::FINANCIAL_ACTION,
            'type' => 'route',
            'permissions' => ['admin.access'],
        ];
    }

    private function reindexOrders(array $items): array
    {
        foreach ($items as $index => &$item) {
            $item['order'] = $index;
        }
        unset($item);

        return $items;
    }

    public function down(): void
    {
        // Leave customized navigation intact; rolling back a deployment must
        // not disrupt custom menu configurations.
    }
};
