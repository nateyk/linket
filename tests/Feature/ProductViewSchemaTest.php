<?php

namespace Tests\Feature;

use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProductViewSchemaTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        ActiveWorkspace::clearCache();
        parent::tearDown();
    }

    private function createProduct(): DigitalProduct
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
        ActiveWorkspace::clearCache();

        return DigitalProduct::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Product '.Str::random(6),
            'price_cents' => 0,
            'currency' => 'ETB',
            'status' => 'approved',
            'type' => 'digital',
        ]);
    }

    public function test_product_views_schema_and_relations(): void
    {
        $this->assertTrue(Schema::hasTable('product_views'));
        $this->assertTrue(Schema::hasColumns('product_views', [
            'digital_product_id', 'ip_hash', 'country', 'referrer', 'created_at',
        ]));
        $this->assertTrue(Schema::hasColumns('digital_products', ['views_count']));
    }

    public function test_product_views_relation_and_cascade_delete(): void
    {
        $product = $this->createProduct();
        $product->views()->create(['ip_hash' => str_repeat('a', 64), 'created_at' => now()]);
        $product->views()->create(['ip_hash' => str_repeat('b', 64), 'created_at' => now()]);

        $this->assertSame(2, $product->views()->count());

        $productId = $product->id;
        $product->forceDelete();

        $this->assertSame(0, \Illuminate\Support\Facades\DB::table('product_views')->where('digital_product_id', $productId)->count());
    }
}