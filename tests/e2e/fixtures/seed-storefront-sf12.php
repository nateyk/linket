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

echo rtrim($appUrl, '/').'/'.$store->back_half.'/services/'.$service->slug.PHP_EOL;
