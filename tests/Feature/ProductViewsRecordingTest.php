<?php

namespace Tests\Feature;

use App\Biolinks\Models\Biolink;
use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use Common\Files\FileEntry;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProductViewsRecordingTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        ActiveWorkspace::clearCache();
        parent::tearDown();
    }

    public function testProductPageRenderRecordsAView(): void
    {
        [$biolink, $product] = $this->visibleProduct();
        ActiveWorkspace::clearCache();

        $this->get("/{$biolink->back_half}/products/{$product->id}")->assertOk();

        $this->assertSame(1, $product->views()->count());
        $this->assertSame(1, $product->fresh()->views_count);
    }

    public function testSameIpWithin24HoursRecordsOnlyOneView(): void
    {
        [$biolink, $product] = $this->visibleProduct();
        ActiveWorkspace::clearCache();

        $this->get("/{$biolink->back_half}/products/{$product->id}")->assertOk();
        $this->get("/{$biolink->back_half}/products/{$product->id}")->assertOk();

        $this->assertSame(1, $product->views()->count());
        $this->assertSame(1, $product->fresh()->views_count);
    }

    /**
     * @return array{Biolink, DigitalProduct}
     */
    private function visibleProduct(): array
    {
        $token = Str::lower(Str::random(12));
        $creator = User::query()->forceCreate([
            'name' => 'Creator '.$token,
            'username' => $token,
            'email' => "{$token}@example.test",
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);

        $biolink = Biolink::query()->create([
            'back_half' => Str::random(8),
            'name' => 'Test Storefront',
            'user_id' => $creator->id,
            'workspace_id' => $workspace->id,
        ]);

        $product = DigitalProduct::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Test Guide',
            'price_cents' => 1000,
            'currency' => 'ETB',
            'status' => 'approved',
            'approved_at' => now(),
            'type' => 'digital',
        ]);

        $file = FileEntry::query()->create([
            'name' => 'download.pdf',
            'file_name' => Str::random(20),
            'file_size' => 1024,
            'mime' => 'application/pdf',
            'extension' => 'pdf',
            'type' => 'file',
            'workspace_id' => $workspace->id,
            'owner_id' => $creator->id,
        ]);
        $product->files()->attach($file->id);
        $product->biolinks()->attach($biolink->id);

        return [$biolink, $product];
    }
}