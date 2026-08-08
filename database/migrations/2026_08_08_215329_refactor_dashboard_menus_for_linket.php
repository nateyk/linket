<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const LINK_ACTIONS = [
        '/dashboard/links',
        '/dashboard/qr-codes',
        '/dashboard/folders',
        '/dashboard/custom-domains',
        '/dashboard/link-overlays',
        '/dashboard/link-pages',
        '/admin/links',
        '/admin/qr-codes',
        '/admin/folders',
        '/admin/custom-domains',
        '/admin/link-overlays',
        '/admin/link-pages',
        '/admin/pixels',
    ];

    public function up(): void
    {
        $setting = DB::table('settings')->where('name', 'menus')->first();
        if (!$setting) {
            return;
        }

        $menus = json_decode($setting->value, true);
        if (!is_array($menus)) {
            return;
        }

        foreach ($menus as &$menu) {
            if (!isset($menu['items']) || !is_array($menu['items'])) {
                continue;
            }

            $positions = $menu['positions'] ?? [];

            if (in_array('dashboard-primary', $positions)) {
                $menu['items'] = $this->buildDashboardPrimaryItems($menu['items']);
            }

            if (in_array('dashboard-secondary', $positions)) {
                $menu['items'] = $this->buildDashboardSecondaryItems($menu['items']);
            }

            if (in_array('dashboard-mobile', $positions)) {
                $menu['items'] = $this->buildDashboardMobileItems($menu['items']);
            }

            if (in_array('admin-sidebar', $positions)) {
                $menu['items'] = $this->buildAdminSidebarItems($menu['items']);
            }
        }

        DB::table('settings')
            ->where('name', 'menus')
            ->update(['value' => json_encode($menus)]);
    }

    private function buildDashboardPrimaryItems(array $existing): array
    {
        $newItems = [];
        $seenActions = [];

        $desired = [
            ['type' => 'route', 'label' => 'Home', 'action' => '/dashboard', 'id' => 'dashboard-home'],
            ['type' => 'route', 'label' => 'Storefront', 'action' => '/dashboard/biolinks', 'id' => 239],
            ['type' => 'route', 'label' => 'Digital Products', 'action' => '/dashboard/my-products', 'id' => 'digital-products-dashboard'],
            ['type' => 'route', 'label' => 'Sales & Payouts', 'action' => '/dashboard/sales-payouts', 'id' => 'sales-payouts-dashboard'],
        ];

        foreach ($desired as $item) {
            $newItems[] = $item;
            $seenActions[] = $item['action'];
        }

        foreach ($existing as $item) {
            $action = $item['action'] ?? '';
            if (!in_array($action, $seenActions) && !$this->isLinkAction($action)) {
                $newItems[] = $item;
                $seenActions[] = $action;
            }
        }

        return $newItems;
    }

    private function buildDashboardSecondaryItems(array $existing): array
    {
        $newItems = [];
        $seenActions = [];

        $desired = [
            ['type' => 'route', 'label' => 'Insights', 'action' => '/dashboard/insights', 'id' => 318],
            ['type' => 'route', 'label' => 'Tracking pixels', 'action' => '/dashboard/pixels', 'id' => 303],
        ];

        foreach ($desired as $item) {
            $newItems[] = $item;
            $seenActions[] = $item['action'];
        }

        foreach ($existing as $item) {
            $action = $item['action'] ?? '';
            if (!in_array($action, $seenActions) && !$this->isLinkAction($action) && $action !== '/dashboard/sales-payouts') {
                $newItems[] = $item;
                $seenActions[] = $action;
            }
        }

        return $newItems;
    }

    private function buildDashboardMobileItems(array $existing): array
    {
        $newItems = [];
        $seenActions = [];

        $desired = [
            ['type' => 'route', 'label' => 'Home', 'action' => '/dashboard', 'id' => 'dashboard-home-mobile'],
            ['type' => 'route', 'label' => 'Storefront', 'action' => '/dashboard/biolinks', 'id' => 239],
            ['type' => 'route', 'label' => 'Digital Products', 'action' => '/dashboard/my-products', 'id' => 'digital-products-mobile'],
            ['type' => 'route', 'label' => 'Sales & Payouts', 'action' => '/dashboard/sales-payouts', 'id' => 'sales-payouts-mobile'],
        ];

        foreach ($desired as $item) {
            $newItems[] = $item;
            $seenActions[] = $item['action'];
        }

        foreach ($existing as $item) {
            $action = $item['action'] ?? '';
            if (!in_array($action, $seenActions) && !$this->isLinkAction($action)) {
                $newItems[] = $item;
                $seenActions[] = $action;
            }
        }

        return $newItems;
    }

    private function buildAdminSidebarItems(array $existing): array
    {
        $commerceItems = [
            ['type' => 'route', 'label' => 'Digital Products', 'action' => '/admin/digital-products', 'id' => 'digital-products-admin'],
            ['type' => 'route', 'label' => 'Withdrawals', 'action' => '/admin/withdrawals', 'id' => 'admin-withdrawals'],
            ['type' => 'route', 'label' => 'Payment Activity', 'action' => '/admin/payment-activity', 'id' => 'admin-payment-activity'],
            ['type' => 'route', 'label' => 'KYC Verifications', 'action' => '/admin/kyc-verifications', 'id' => 'admin-kyc-verifications'],
            ['type' => 'route', 'label' => 'Withdrawal Methods', 'action' => '/admin/financial/withdrawal-methods', 'id' => 'admin-withdrawal-methods'],
        ];

        $commerceActions = array_column($commerceItems, 'action');

        $newItems = [];
        $seenActions = [];

        foreach ($existing as $item) {
            $action = $item['action'] ?? '';
            if ($this->isLinkAction($action)) {
                continue;
            }
            if (in_array($action, $commerceActions)) {
                continue;
            }
            if ($action === '/admin/biolinks') {
                continue;
            }
            $newItems[] = $item;
            $seenActions[] = $action;
        }

        foreach ($commerceItems as $item) {
            if (!in_array($item['action'], $seenActions)) {
                $newItems[] = $item;
                $seenActions[] = $item['action'];
            }
        }

        return $newItems;
    }

    private function isLinkAction(string $action): bool
    {
        return in_array($action, self::LINK_ACTIONS);
    }

    public function down(): void
    {
        // Irreversible — restoring original BeLink menus is not supported
    }
};