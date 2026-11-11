<?php

/**
 * Disposable SF-12 public service fixture for local-only Playwright QA.
 * This script is never called from the production app or a deploy workflow.
 */
require __DIR__.'/../../../vendor/autoload.php';

$app = require __DIR__.'/../../../bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\CreatorServices\Models\CreatorService;
use App\CreatorServices\Models\ServiceFaq;
use App\CreatorServices\Models\ServicePackage;
use App\Stores\Models\Store;
use App\Storefront\Models\DigitalProduct;
use Illuminate\Support\Facades\DB;

$database = (string) DB::connection()->getDatabaseName();
$appUrl = (string) config('app.url');
$host = strtolower((string) parse_url($appUrl, PHP_URL_HOST));

if (
    getenv('LINKET_ISOLATED_E2E') !== '1'
    || ! app()->environment('testing')
    || $database !== 'belink_test'
    || ! in_array($host, ['127.0.0.1', 'localhost'], true)
    || ! config('services.verify_et.mock')
) {
    fwrite(STDERR, "SF-12 synthetic seeding denied: requires disposable DB and loopback test app.\n");
    exit(1);
}

$store = Store::query()->where('back_half', 'e2e-buyer-store')->firstOrFail();
$product = DigitalProduct::query()
    ->where('user_id', $store->user_id)
    ->where('title', 'E2E Buyer Digital Guide')
    ->firstOrFail();

// The buyer E2E seed links the product to the store, but does not create the
// visual Shop widget. A published creator profile hides Products without it.
$store->forceFill([
    'builder_mode' => Store::BUILDER_MODE_CREATOR_PROFILE,
    'profile_config' => [
        'display_name' => 'E2E Buyer Creator',
        'profile_title' => 'Synthetic QA storefront',
        'bio' => 'Test-only shop and service profile',
    ],
])->save();
$store->widgets()->updateOrCreate(
    ['type' => 'shop'],
    [
        'active' => true,
        'position' => 0,
        'config' => [
            'source' => 'digital-products',
            'product_ids' => [$product->id],
        ],
    ],
);
$service = CreatorService::query()->updateOrCreate(
    ['store_id' => $store->id, 'slug' => 'sf12-qa-service'],
    [
        'workspace_id' => $store->workspace_id,
        'user_id' => $store->user_id,
        'title' => 'የንግድ መለያ Brand Identity Service',
        'short_description' => 'አማርኛ English long-form service details for responsive QA.',
        'description' => '<p>Multilingual design service for automated layout QA only.</p>',
        'status' => 'published',
        'currency' => 'ETB',
        'contact_channels' => [
            ['type' => 'email', 'label' => 'Email creator', 'value' => 'qa-creator@example.test'],
        ],
    ],
);

foreach ([
    ['name' => 'Basic', 'price_cents' => 0, 'position' => 0],
    ['name' => 'Standard', 'price_cents' => 9900, 'position' => 1],
    ['name' => 'PremiumExtraLongServicePackageNameየብራንድንድፍ', 'price_cents' => null, 'position' => 2],
] as $tier) {
    ServicePackage::query()->updateOrCreate(
        ['creator_service_id' => $service->id, 'position' => $tier['position']],
        [
            'name' => $tier['name'],
            'description' => 'አማርኛ MixedScriptDetailsWithoutSpacesToTestResponsiveWrapping',
            'price_cents' => $tier['price_cents'],
            'currency' => 'ETB',
            'delivery_days' => 5,
            'revisions' => 2,
            'features' => ['Design', 'Editable files'],
        ],
    );
}

ServiceFaq::query()->updateOrCreate(
    ['creator_service_id' => $service->id, 'position' => 0],
    [
        'question' => 'How does የንግድ መለያ design work?',
        'answer' => 'An isolated test-only FAQ; never submit real inquiries.',
    ],
);

// Exercise *persisted* creator Appearance, not only OS color preferences.
// These three public stores share only synthetic owner/products with the
// disposable buyer fixture. Never create these records in a non-test DB.
$appearanceVariants = [
    'light' => [
        'bgConfig' => ['backgroundColor' => '#f8fafc', 'color' => '#1e293b'],
        'btnConfig' => ['variant' => 'solid', 'color' => '#1e293b', 'textColor' => '#ffffff'],
        'fontConfig' => ['family' => 'Inter'],
    ],
    'dark' => [
        'bgConfig' => ['backgroundColor' => '#111827', 'color' => '#f9fafb'],
        'btnConfig' => ['variant' => 'solid', 'color' => '#2563eb', 'textColor' => '#ffffff'],
        'fontConfig' => ['family' => 'Inter'],
    ],
    'gradient' => [
        'bgConfig' => [
            'backgroundImage' => 'linear-gradient(135deg, #e0f2fe 0%, #c7d2fe 100%)',
            'color' => '#111827',
        ],
        'btnConfig' => ['variant' => 'solid', 'color' => '#1d4ed8', 'textColor' => '#ffffff'],
        'fontConfig' => ['family' => 'Inter'],
    ],
];

try {
foreach ($appearanceVariants as $variant => $config) {
    $variantStore = Store::query()->updateOrCreate(
        ['back_half' => 'sf12-appearance-'.$variant],
        [
            'name' => 'Synthetic Appearance '.$variant,
            'user_id' => $store->user_id,
            'workspace_id' => $store->workspace_id,
            'builder_mode' => Store::BUILDER_MODE_CREATOR_PROFILE,
            'profile_config' => [
                'display_name' => 'አማርኛ English Creator '.$variant,
                'profile_title' => 'Synthetic multilingual Appearance fixture',
                'bio' => 'የንግድ መለያ MultilingualCardDescriptionWithoutSpaces',
            ],
        ],
    );
    $variantStore->appearance()->updateOrCreate([], ['config' => $config]);
    $product->stores()->syncWithoutDetaching([$variantStore->id]);
    $variantStore->widgets()->updateOrCreate(
        ['type' => 'shop'],
        [
            'active' => true,
            'position' => 0,
            'config' => [
                'source' => 'digital-products',
                'product_ids' => [$product->id],
            ],
        ],
    );
    $variantService = CreatorService::query()->updateOrCreate(
        ['store_id' => $variantStore->id, 'slug' => 'sf12-qa-service-'.$variant],
        [
            'workspace_id' => $variantStore->workspace_id,
            'user_id' => $variantStore->user_id,
            'title' => 'የንግድ መለያ Brand Design '.$variant,
            'short_description' => 'አማርኛ and English for saved Appearance QA.',
            'description' => '<p>Test-only published creator service.</p>',
            'status' => 'published',
            'currency' => 'ETB',
            'contact_channels' => [
                ['type' => 'email', 'label' => 'Email creator', 'value' => 'qa-creator@example.test'],
            ],
        ],
    );
    ServicePackage::query()->updateOrCreate(
        ['creator_service_id' => $variantService->id, 'position' => 0],
        [
            'name' => 'Synthetic Package '.$variant,
            'description' => 'Test-only package',
            'price_cents' => 9900,
            'currency' => 'ETB',
            'delivery_days' => 3,
            'revisions' => 1,
            'features' => ['English', 'አማርኛ'],
        ],
    );
}
} catch (\Throwable $error) {
    // This is an isolated test run; report the exception rather than letting
    // the application's console exception handler render HTML to stdout.
    fwrite(STDERR, 'SF-12 Appearance fixture: '.get_class($error).': '.$error->getMessage().PHP_EOL);
    exit(1);
}

echo rtrim($appUrl, '/').'/'.$store->back_half.'/services/'.$service->slug.PHP_EOL;
