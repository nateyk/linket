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
        // Independent, default-OFF HTTP browser consent gate (no token or MCP routes).
        'mcp_http_oauth' => env('CREATOR_AI_MCP_HTTP_ENABLED', false),
        // Separate, default-OFF stateless code and refresh token endpoint.
        'mcp_http_token' => env('CREATOR_AI_MCP_TOKEN_HTTP_ENABLED', false),
        // Public metadata and remote MCP each require an independent release gate.
        'mcp_http_discovery' => env('CREATOR_AI_MCP_DISCOVERY_HTTP_ENABLED', false),
        'mcp_http_server' => env('CREATOR_AI_MCP_SERVER_HTTP_ENABLED', false),
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


    // Internal source ingestion is isolated from forecast publication. BOTH
    // distinct source signing keys and explicit workspace allowlists must be
    // configured by an operator; no live credentials are bundled or defaulted.
    // These HMACs authenticate configured producers, not Verify.et itself or
    // completeness of any upstream event stream.
    'forecast_ingestion' => [
        'enabled' => env('CREATOR_AI_FORECAST_INGESTION_ENABLED', false),
        // Pinned public keys of independently managed Ed25519 producers.
        // Private keys must never enter Linket deployment or the database.
        'public_keys' => [
            'checkout_event_stream' => [
                'v1' => env('CREATOR_AI_FORECAST_CHECKOUT_ED25519_PUBLIC_V1'),
            ],
            'verify_et_reconciliation' => [
                'v1' => env('CREATOR_AI_FORECAST_RECONCILIATION_ED25519_PUBLIC_V1'),
            ],
        ],
        'signers' => [
            'checkout_event_stream' => [
                'v1' => [
                    'key' => env('CREATOR_AI_FORECAST_CHECKOUT_HMAC_V1'),
                    'workspace_ids' => array_values(array_filter(array_map(
                        'intval', explode(',', (string) env('CREATOR_AI_FORECAST_CHECKOUT_WORKSPACES', ''))
                    ))),
                ],
            ],
            'verify_et_reconciliation' => [
                'v1' => [
                    'key' => env('CREATOR_AI_FORECAST_RECONCILIATION_HMAC_V1'),
                    'workspace_ids' => array_values(array_filter(array_map(
                        'intval', explode(',', (string) env('CREATOR_AI_FORECAST_RECONCILIATION_WORKSPACES', ''))
                    ))),
                ],
            ],
        ],
    ],

    'max_report_days' => 366,
    'max_orders_per_page' => 20,
    'max_product_results' => 20,

    // Defaults for the separate future generation-quota service, NOT a billing
    // charge for deterministic reports or read-only MCP calls.
    'free_monthly_generation_requests' => 10,
    'pro_monthly_generation_requests' => 100,
    'mcp_read_rate_limit_per_minute' => 30,
];
