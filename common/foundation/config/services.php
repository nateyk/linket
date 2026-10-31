<?php

return [
    'ftp' => [
        'host' => env('STORAGE_FTP_HOST'),
        'username' => env('STORAGE_FTP_USERNAME'),
        'password' => env('STORAGE_FTP_PASSWORD'),
        'port' => (int) env('STORAGE_FTP_PORT', 21),
        'passive' => env('STORAGE_FTP_PASSIVE'),
        'ssl' => env('STORAGE_FTP_SSL'),
    ],

    'backblaze_s3' => [
        'key' => env('STORAGE_BACKBLAZE_KEY'),
        'secret' => env('STORAGE_BACKBLAZE_SECRET'),
        'bucket' => env('STORAGE_BACKBLAZE_BUCKET'),
        'region' => env('STORAGE_BACKBLAZE_REGION'),
    ],

    's3' => [
        'key' => env('STORAGE_S3_KEY'),
        'secret' => env('STORAGE_S3_SECRET'),
        'region' => env('STORAGE_S3_REGION'),
        'bucket' => env('STORAGE_S3_BUCKET'),
        'endpoint' => env('STORAGE_S3_ENDPOINT'),
        'use_path_style_endpoint' => env(
            'STORAGE_S3_USE_PATH_STYLE_ENDPOINT',
            false,
        ),
    ],

    'digitalocean_s3' => [
        'key' => env('STORAGE_DIGITALOCEAN_KEY'),
        'secret' => env('STORAGE_DIGITALOCEAN_SECRET'),
        'region' => env('STORAGE_DIGITALOCEAN_REGION'),
        'bucket' => env('STORAGE_DIGITALOCEAN_BUCKET'),
    ],

    /**
     * Billing credentials
     */

    'paypal' => [
        'client_id' => env('PAYPAL_CLIENT_ID'),
        'secret' => env('PAYPAL_SECRET'),
        'webhook_id' => env('PAYPAL_WEBHOOK_ID'),
        'product_id' => env('PAYPAL_PRODUCT_ID'),
        'product_name' => env('PAYPAL_PRODUCT_NAME'),
    ],

    'stripe' => [
        'model' => \App\Models\User::class,
        'key' => env('STRIPE_KEY'),
        'secret' => env('STRIPE_SECRET'),
        'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
    ],

    'chapa' => [
        'secret' => env('CHAPA_SECRET_KEY'),
        'webhook_secret' => env('CHAPA_WEBHOOK_SECRET'),
    ],

    'verify_et' => [
        'base_url' => env('VERIFY_ET_BASE_URL', 'https://verify.et'),
        'api_key' => env('VERIFY_ET_API_KEY'),
        'webhook_secret' => env('VERIFY_ET_WEBHOOK_SECRET'),
        'webhook_previous_secret' => env('VERIFY_ET_WEBHOOK_PREVIOUS_SECRET'),
        'webhook_previous_secret_rotated_at' => env('VERIFY_ET_WEBHOOK_PREVIOUS_SECRET_ROTATED_AT'),
        'webhook_previous_secret_expires_at' => env('VERIFY_ET_WEBHOOK_PREVIOUS_SECRET_EXPIRES_AT'),
        'experiment_webhook_enabled' => env('VERIFY_ET_EXPERIMENT_WEBHOOK_ENABLED', false),
        'experiment_webhook_secret' => env('VERIFY_ET_EXPERIMENT_WEBHOOK_SECRET'),
        'experiment_webhook_previous_secret' => env('VERIFY_ET_EXPERIMENT_WEBHOOK_PREVIOUS_SECRET'),
        'experiment_webhook_rotated_at' => env('VERIFY_ET_EXPERIMENT_WEBHOOK_ROTATED_AT'),
        'experiment_receiver_id' => env('VERIFY_ET_EXPERIMENT_RECEIVER_ID'),
        'experiment_webhook_url' => env('VERIFY_ET_EXPERIMENT_WEBHOOK_URL'),
        'experiment_webhook_test_event_id' => env('VERIFY_ET_EXPERIMENT_WEBHOOK_TEST_EVENT_ID'),
        'experiment_destination_confirmed' => env('VERIFY_ET_EXPERIMENT_DESTINATION_CONFIRMED', false),
        'experiment_public_reachability_confirmed' => env('VERIFY_ET_EXPERIMENT_PUBLIC_REACHABILITY_CONFIRMED', false),
        'image_processing_enabled' => env('VERIFY_ET_IMAGE_PROCESSING_ENABLED', false),
        'corporate_account' => env('VERIFY_ET_CORPORATE_ACCOUNT'),
        'corporate_bank_code' => env('VERIFY_ET_CORPORATE_BANK_CODE', 'cbe'),
        'alert_email' => env('VERIFY_ET_ALERT_EMAIL'),
        'enabled' => env('VERIFY_ET_ENABLED', false),
        // Local/isolated E2E only. Never enable against a non-test database.
        'mock' => env('VERIFY_ET_MOCK', false),
    ],

    /**
     * Socialite login credentials
     */

    'google' => [
        'client_id' => env('GOOGLE_ID'),
        'client_secret' => env('GOOGLE_SECRET'),
        'redirect' => env('APP_URL') . '/secure/auth/social/google/callback',
        'analytics_property_id' => env('ANALYTICS_PROPERTY_ID'),
        'safe_browsing_key' => env('GOOGLE_SAFE_BROWSING_KEY'),
    ],

    'twitter' => [
        'client_id' => env('TWITTER_ID'),
        'client_secret' => env('TWITTER_SECRET'),
        'redirect' => env('APP_URL') . '/secure/auth/social/twitter/callback',
    ],

    'facebook' => [
        'client_id' => env('FACEBOOK_ID'),
        'client_secret' => env('FACEBOOK_SECRET'),
        'redirect' => env('APP_URL') . '/secure/auth/social/facebook/callback',
    ],

    /**
     * LLMs
     */
    'llm_provider' => env('LLM_PROVIDER', 'openai'),
    'embeddings_provider' => env('EMBEDDINGS_PROVIDER', 'openai'),
    'openai' => [
        'api_key' => env('OPENAI_API_KEY'),
        'text_model' => env('OPENAI_TEXT_MODEL', 'gpt-4o-mini'),
    ],
    'anthropic' => [
        'api_key' => env('ANTHROPIC_API_KEY'),
        'text_model' => env(
            'ANTHROPIC_TEXT_MODEL',
            'claude-3-5-sonnet-20240620',
        ),
    ],
    'gemini' => [
        'api_key' => env('GEMINI_API_KEY'),
        'text_model' => env('GEMINI_TEXT_MODEL', 'gemini-1.5-flash'),
    ],
    'openrouter' => [
        'api_key' => env('OPENROUTER_API_KEY'),
        'text_model' => env('OPENROUTER_TEXT_MODEL', 'gpt-4o-mini'),
    ],

    /**
     * Other
     */
    'mailgun' => [
        'domain' => env('MAILGUN_DOMAIN'),
        'secret' => env('MAILGUN_SECRET'),
        'endpoint' => env('MAILGUN_ENDPOINT', 'api.mailgun.net'),
    ],
    'envato' => [
        'client_id' => env('ENVATO_ID'),
        'client_secret' => env('ENVATO_SECRET'),
        'personal_token' => env('ENVATO_PERSONAL_TOKEN'),
        'redirect' => env('APP_URL') . '/secure/auth/social/envato/callback',
    ],
    'slack' => [
        'webhook_url' => env('SLACK_WEBHOOK_URL'),
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],
    'unsplash' => [
        'access_key' => env('UNSPLASH_ACCESS_KEY'),
    ],
    'cloudflare' => [
        'account_id' => env('CLOUDFLARE_ACCOUNT_ID'),
        'api_token' => env('CLOUDFLARE_API_TOKEN'),
    ],
];
