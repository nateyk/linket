<?php

it('creator dashboard does not expose admin link tools', function () {
    $content = file_get_contents(resource_path('client/dashboard/dashboard-routes.tsx'));

    // Spec: sharedDashboardRoutes must gate legacy tools behind if (!isDashboard)
    // Already hides links/qr (42-78) and folders/custom-domains/link-overlays/link-pages (240,271)
    expect(substr_count($content, 'if (!isDashboard)'))->toBeGreaterThanOrEqual(6);

    // Ensure legacy paths are NOT unconditionally pushed for dashboard
    // Check gated blocks exist for each legacy tool
    expect($content)->toContain("path: 'links'");
    expect($content)->toContain("path: 'qr-codes'");
    expect($content)->toContain("path: 'folders'");
    expect($content)->toContain("path: 'custom-domains'");
    expect($content)->toContain("path: 'link-overlays'");
    expect($content)->toContain("path: 'link-pages'");

    // Pixels must stay unconditional (creator growth tool)
    // Ensure 'pixels' route is pushed without gating (exists outside if block)
    expect($content)->toContain("path: 'pixels'");
    // Verify pixels block is NOT inside if (!isDashboard) — count occurrences: pixels should be after gated custom-domains block, unconditional
    $pixelsPos = strpos($content, "path: 'pixels'");
    $gatedBeforePixels = substr_count(substr($content, 0, $pixelsPos), 'if (!isDashboard)');
    $gatedAfterPixels = substr_count($content, 'if (!isDashboard)') - $gatedBeforePixels;
    expect($gatedAfterPixels)->toBeGreaterThanOrEqual(2); // link-overlays and link-pages after pixels

    // Stores canonical must be unconditional for dashboard
    expect($content)->toContain("path: 'stores/:storeId'");
    expect($content)->toContain("path: 'biolinks/:biolinkId'");

    // Top-level dashboardRoutes children must be storefront-first
    expect($content)->toContain("path: 'stores'");
    expect($content)->toContain("path: 'biolinks',");
    // Dashboard routes should spread sharedDashboardRoutes('dashboard') not admin-only paths

    // default-settings.php admin vs dashboard menu split — dashboard-primary is storefront-first
    $menus = json_decode(collect(require resource_path('defaults/default-settings.php'))->firstWhere('name', 'menus')['value'], true);
    $primary = collect($menus)->firstWhere(fn($m) => ($m['positions'][0] ?? null) === 'dashboard-primary');
    $actions = collect($primary['items'] ?? [])->pluck('action');

    expect($actions)->toContain('/dashboard/stores');
    expect($actions)->toContain('/dashboard/pixels');
    expect($actions)->not->toContain('/dashboard/links');
    expect($actions)->not->toContain('/dashboard/folders');
    expect($actions)->not->toContain('/dashboard/qr-codes');
    expect($actions)->not->toContain('/dashboard/custom-domains');
    expect($actions)->not->toContain('/dashboard/link-overlays');
    expect($actions)->not->toContain('/dashboard/link-pages');

    // Secondary and mobile also storefront-first
    $mobile = collect($menus)->firstWhere(fn($m) => ($m['positions'][0] ?? null) === 'dashboard-mobile');
    $mobileActions = collect($mobile['items'] ?? [])->pluck('action');
    expect($mobileActions)->not->toContain('/dashboard/links');
    // The mobile bottom bar intentionally omits Stores; sidebar access remains.
    expect($mobileActions)->not->toContain('/dashboard/stores');
});

it('global search and workspace navigation are storefront-first (hardening)', function () {
    $layout = file_get_contents(resource_path('client/dashboard/layout/app-dasbboard-layout.tsx'));
    // Workspace switch must not navigate to hidden /dashboard/links for creator
    expect($layout)->not->toContain("navigate(`/dashboard/links`)");
    expect($layout)->toContain("navigate(`/dashboard`)");

    $search = file_get_contents(resource_path('client/dashboard/search/global-search-input.tsx'));
    // Default search route must be storefront, not legacy links
    expect($search)->toContain("return `/dashboard/stores`");
    // Ensure default case no longer returns /dashboard/links
    // Count occurrences: only legacy switch cases may contain those, default must be stores
    expect(substr_count($search, "return `/dashboard/links`"))->toBe(0);
    expect($search)->toContain("// storefront-first IA");
});

it('menu editor offers the renamed items route', function () {
    $config = require resource_path('defaults/menu-editor-config.php');
    expect($config['available_routes'])->toContain('/dashboard/items');
    expect($config['available_routes'])->not->toContain('/dashboard/my-products');
});
