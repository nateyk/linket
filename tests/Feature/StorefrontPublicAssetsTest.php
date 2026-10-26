<?php

namespace Tests\Feature;

use App\Links\Actions\LinkeablePublicPolicy;
use App\Analytics\Actions\GetMonthlyClicks;
use App\Analytics\Models\TrackedEvent;
use App\Stores\Models\Store;
use Common\Database\Seeders\RolesTableSeeder;
use Common\Files\FileEntry;
use Common\Settings\Models\Setting;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class StorefrontPublicAssetsTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesTableSeeder::class);
    }

    public function testPublicProductRoutesUseAnUnboundStoreSlugParameter(): void
    {
        $this->assertSame(
            '{storeSlug}/products/{digitalProduct}',
            Route::getRoutes()->getByName('digital-products.public.show')->uri(),
        );
        $this->assertSame(
            '{storeSlug}/products/{digitalProduct}/orders/{order}/success',
            Route::getRoutes()->getByName('digital-products.public.order.success')->uri(),
        );
    }

    public function testStorePublicPolicyDoesNotThrowForTheStoreModelType(): void
    {
        $this->assertTrue(
            app(LinkeablePublicPolicy::class)->isAccessible(new Store()),
        );
    }

    public function testMonthlyClicksIncludesStoreTrackedEvents(): void
    {
        $store = new Store(['id' => 123]);
        TrackedEvent::factory()->create([
            'linkeable_id' => $store->id,
            'linkeable_type' => Store::MODEL_TYPE,
            'event_type' => 'click',
            'crawler' => false,
            'created_at' => now(),
        ]);

        $this->assertSame(1, (new GetMonthlyClicks())->forLinkeable($store));
    }

    public function testLocalUploadUrlsAreRootRelative(): void
    {
        $location = new \Common\Files\Uploads\UploadDiskLocation(
            new \Common\Files\Uploads\UploadType('linkImages', [
                'visibility' => 'public',
                'prefix' => 'link-images',
            ]),
            new \Common\Files\Uploads\UploadBackend([
                'id' => 'local',
                'name' => 'Local',
                'type' => 'local',
                'root' => 'link-images',
            ]),
        );

        $this->assertSame('/storage/link-images', $location->url);
    }

    public function testPublicUploadUrlsPreserveTheirLeadingSlash(): void
    {
        settings()->set('uploading.backends', [[
            'id' => 'local',
            'name' => 'Local',
            'type' => 'local',
            'root' => '',
        ]]);
        settings()->set('uploading.types', [
            'linkImages' => ['backends' => ['local']],
        ]);

        $file = new FileEntry([
            'file_name' => 'cover.jpg',
            'type' => 'image',
            'public' => true,
            'upload_type' => 'linkImages',
            'backend_id' => 'local',
        ]);

        $this->assertSame('/storage/link-images/cover.jpg', $file->url);
    }

    public function testPublicFaviconExists(): void
    {
        $this->assertFileExists(public_path('favicon.ico'));
    }
}
