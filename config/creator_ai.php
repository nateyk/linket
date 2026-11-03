<?php

/**
 * Creator AI is isolated from the existing helpdesk AI and disabled until an
 * administrator explicitly enables its individual read-only capabilities.
 *
 * These values are deployment defaults; the Admin-managed provider, quota
 * ledger and spending budgets are implemented in later work packages.
 */
return [
    'enabled' => env('CREATOR_AI_ENABLED', false),

    'features' => [
        'sales_summary' => env('CREATOR_AI_SALES_SUMMARY_ENABLED', false),
        'sales_trends' => env('CREATOR_AI_SALES_TRENDS_ENABLED', false),
        'product_performance' => env('CREATOR_AI_PRODUCT_PERFORMANCE_ENABLED', false),
        'order_insights' => env('CREATOR_AI_ORDER_INSIGHTS_ENABLED', false),
        'mcp' => env('CREATOR_AI_MCP_ENABLED', false),
        // Separate, default-OFF public OAuth protocol gate; MCP reports may remain internal.
        'mcp_oauth' => env('CREATOR_AI_MCP_OAUTH_ENABLED', false),
        'forecast' => env('CREATOR_AI_FORECAST_ENABLED', false),
        'writing_basic' => env('CREATOR_AI_WRITING_BASIC_ENABLED', false),
        'writing_advanced' => env('CREATOR_AI_WRITING_ADVANCED_ENABLED', false),
        'storefront_drafts' => env('CREATOR_AI_STOREFRONT_DRAFTS_ENABLED', false),
    ],

    // Exact canonical HTTPS resource used for OAuth RFC 8707 resource binding.
    // No fallback: if unset, MCP OAuth preflight fails closed even if enabled.
    'mcp_resource_url' => env('CREATOR_AI_MCP_RESOURCE_URL'),
    // HTTPS issuer must be explicitly configured; no fallback to app URL.
    'oauth_issuer' => env('CREATOR_AI_OAUTH_ISSUER'),

    'max_report_days' => 366,
    'max_orders_per_page' => 20,
    'max_product_results' => 20,

    // Defaults for the separate future generation-quota service, NOT a billing
    // charge for deterministic reports or read-only MCP calls.
    'free_monthly_generation_requests' => 10,
    'pro_monthly_generation_requests' => 100,
    'mcp_read_rate_limit_per_minute' => 30,
];
