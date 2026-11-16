<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const FINANCIAL_ACTION = '/admin/financial';

    private const FINANCIAL_ID = 'admin-financial';

    public function up(): void
    {
        $raw = DB::table('settings')->where('name', 'menus')->value('value');
        $menus = json_decode((string) $raw, true);

        if (! is_array($menus)) {
            return;
        }

        $updated = array_map($this->consolidateMenu(...), $menus);

        if ($updated === $menus) {
            return;
        }

        DB::table('settings')->where('name', 'menus')->update([
            'value' => json_encode($updated, JSON_UNESCAPED_SLASHES),
            'updated_at' => now(),
        ]);

        Cache::forget('settings.public');
    }

    private function consolidateMenu(mixed $menu): mixed
    {
        if (! is_array($menu) || ! in_array('admin-sidebar', $menu['positions'] ?? [], true)) {
            return $menu;
        }

        $items = $menu['items'] ?? [];
        $clean = array_values(array_filter($items, $this->isRetainedItem(...)));

        if ($this->hasFinancialItem($clean)) {
            $menu['items'] = $this->assignOrders($clean);

            return $menu;
        }

        $target = $this->findInsertIndex($items, count($clean));
        array_splice($clean, $target, 0, [$this->financialItem()]);

        $menu['items'] = $this->assignOrders($clean);

        return $menu;
    }

    private function isRetainedItem(mixed $item): bool
    {
        return is_array($item) && ! $this->isObsolete($item);
    }

    private function isObsolete(array $item): bool
    {
        $obsolete = [
            '/admin/financial/payment-gateways',
            '/admin/financial/withdrawal-methods',
            '/admin/withdrawals',
            '/admin/payment-activity',
            'admin-payment-gateways',
            'admin-withdrawal-methods',
            'admin-withdrawals',
            'admin-payment-activity',
        ];

        return in_array($item['action'] ?? '', $obsolete, true)
            || in_array($item['id'] ?? '', $obsolete, true);
    }

    private function findInsertIndex(array $items, int $fallback): int
    {
        $obsoleteIndex = collect($items)->search($this->isObsolete(...));
        if ($obsoleteIndex !== false) {
            return min((int) $obsoleteIndex, $fallback);
        }

        $productIndex = collect($items)->search(
            fn (array $item): bool => in_array($item['action'] ?? '', ['/admin/items', '/admin/digital-products'], true)
        );
        if ($productIndex !== false) {
            return min((int) $productIndex + 1, $fallback);
        }

        return $fallback;
    }

    private function hasFinancialItem(array $items): bool
    {
        return collect($items)->contains(
            fn (array $item): bool => ($item['id'] ?? '') === self::FINANCIAL_ID
                || in_array($item['action'] ?? '', [self::FINANCIAL_ACTION, '/admin/financial/general'], true)
        );
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

    private function assignOrders(array $items): array
    {
        return array_values(array_map(
            fn (int $index, array $item): array => array_merge($item, ['order' => $index]),
            array_keys($items),
            $items
        ));
    }

    public function down(): void
    {
        // No-op: sidebar menu consolidation is forward-only.
    }
};
