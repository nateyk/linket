<?php

declare(strict_types=1);

/**
 * PromptPHP Intercept defaults for this application.
 *
 * Vendor defaults merge aggressively (e.g. injection `block`, PII `block_entities`
 * including api_key). That breaks legitimate flows when an admin API key appears
 * in JSON prompts for config/tests. Staging-safe defaults here; per-agent
 * CreatorProductCopyAgent still overrides actions when feature flags enable it.
 */
return [
    'middleware' => [
        'injection_guard' => [
            'action' => env('INTERCEPT_INJECTION_GUARD_ACTION', 'log'),
            'patterns' => [],
            'merge_patterns' => true,
            'normalise_prompt' => true,
            'log_prompt_preview' => env('INTERCEPT_INJECTION_GUARD_LOG_PROMPT_PREVIEW', false),
            'scan_approval_decisions' => false,
        ],

        'pii_redactor' => [
            'action' => env('INTERCEPT_PII_REDACTOR_ACTION', 'redact'),
            'entities' => [
                'email',
                'phone',
                'credit_card',
                'ip_address',
                'api_key',
                'bearer_token',
                'mac_address',
                'url',
            ],
            /** Empty = never block on entity type alone; blocking uses agent action `block` + explicit block_entities. */
            'block_entities' => [],
            'allowed_emails' => [],
            'allowed_domains' => [],
            'replacement_format' => '[{{TYPE}}_{{INDEX}}]',
            'mask_character' => '*',
            'log_detections' => env('INTERCEPT_PII_LOG_DETECTIONS', true),
            'log_preview' => env('INTERCEPT_PII_LOG_PREVIEW', false),
            'scan_approval_decisions' => false,
        ],

        'tool_approval_guard' => [
            'action' => 'log',
            'allowed_tools' => [],
            'denied_tools' => [],
            'scan_pii' => true,
            'scan_injection' => false,
            'entities' => [
                'credit_card',
                'api_key',
                'bearer_token',
            ],
            'block_entities' => [
                'credit_card',
                'api_key',
                'bearer_token',
            ],
            'log_preview' => false,
        ],

        'budget_guard' => [
            'action' => 'block',
            'max_cost_per_request' => null,
            'max_cost_per_session' => null,
            'max_cost_per_user_per_day' => null,
            'session_window_hours' => 24,
            'assumed_output_tokens' => 1000,
            'model_pricing' => [],
            'unknown_model_action' => 'allow',
            'cache_store' => null,
            'log_preview' => false,
        ],
    ],
];
