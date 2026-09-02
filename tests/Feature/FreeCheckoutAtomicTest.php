<?php

namespace Tests\Feature;

use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\StorefrontCheckout;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class FreeCheckoutAtomicTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        ActiveWorkspace::clearCache();
        parent::tearDown();
    }

    private function createCreator(): User
    {
        $token = Str::lower(Str::random(12));
        return User::query()->forceCreate([
            'name' => 'Creator ' . $token,
            'username' => $token,
            'email' => "{$token}@example.test",
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);
    }

    public function testFreeCheckoutCreatesPaidOrderWithEntitlements(): void
    {
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        ActiveWorkspace::clearCache();

        $product = DigitalProduct::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Free Product ' . Str::random(6),
            'price_cents' => 0,
            'currency' => 'ETB',
            'status' => 'approved',
            'type' => 'digital',
        ]);

        // Add a file so entitlement can be created
        $file = \Common\Files\FileEntry::query()->create([
            'name' => 'file-'.Str::random(6).'.pdf',
            'file_name' => 'file-'.Str::random(6).'.pdf',
            'mime' => 'application/pdf',
            'extension' => 'pdf',
            'type' => 'file',
            'file_size' => 100,
            'workspace_id' => $workspace->id,
            'owner_id' => $creator->id,
        ]);
        $product->files()->attach($file->id);

        $order = app(StorefrontCheckout::class)->create($product->fresh()->load('creator'), null, [
            'name' => 'Buyer',
            'email' => 'buyer@example.test',
        ]);

        $this->assertSame('paid', $order->fresh()->status);
        $this->assertNotNull($order->fresh()->paid_at);
        $this->assertTrue($order->fresh()->entitlements()->exists());
        $this->assertDatabaseHas('digital_product_earnings_ledger', ['storefront_order_id' => $order->id]);
    }

    public function testFreeCheckoutFailureDoesNotLeavePaidOrderWithoutFulfillment(): void
    {
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        ActiveWorkspace::clearCache();

        $product = DigitalProduct::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Free Product Fail ' . Str::random(6),
            'price_cents' => 0,
            'currency' => 'ETB',
            'status' => 'approved',
            'type' => 'digital',
        ]);

        $file = \Common\Files\FileEntry::query()->create([
            'name' => 'file-'.Str::random(6).'.pdf',
            'file_name' => 'file-'.Str::random(6).'.pdf',
            'mime' => 'application/pdf',
            'extension' => 'pdf',
            'type' => 'file',
            'file_size' => 100,
            'workspace_id' => $workspace->id,
            'owner_id' => $creator->id,
        ]);
        $product->files()->attach($file->id);

        // Mock finance to throw to simulate partial fulfillment failure
        $mock = $this->createMock(\App\Storefront\DigitalProductFinance::class);
        $mock->method('creditOrder')->willThrowException(new \RuntimeException('simulated ledger failure'));
        app()->instance(\App\Storefront\DigitalProductFinance::class, $mock);

        try {
            app(StorefrontCheckout::class)->create($product->fresh()->load('creator'), null, [
                'name' => 'Buyer',
                'email' => 'buyer-fail@example.test',
            ]);
            $this->fail('Expected free checkout to throw on fulfillment failure');
        } catch (\RuntimeException $e) {
            $this->assertSame('simulated ledger failure', $e->getMessage());
        }

        // Order should not be left as paid without ledger; it should be deleted or not paid
        $order = StorefrontOrder::query()->where('buyer_email', 'buyer-fail@example.test')->first();
        if ($order) {
            $this->assertNotSame('paid', $order->status, 'Failed free checkout should not be left paid');
            $this->assertFalse(\App\Storefront\Models\DownloadEntitlement::where('storefront_order_id', $order->id)->exists(), 'No entitlements should exist for failed fulfillment');
            $this->assertDatabaseMissing('digital_product_earnings_ledger', ['storefront_order_id' => $order->id]);
        } else {
            $this->assertNull($order, 'Order was deleted on failure — acceptable');
        }
    }

    public function testFreeCourseCheckoutGrantsEnrollment(): void
    {
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        ActiveWorkspace::clearCache();

        $product = DigitalProduct::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Free Course ' . Str::random(6),
            'price_cents' => 0,
            'currency' => 'ETB',
            'status' => 'approved',
            'type' => 'course',
        ]);
        $course = \App\Courses\Models\Course::firstOrCreate(
            ['digital_product_id' => $product->id],
            ['instructor_user_id' => $creator->id],
        );

        $student = $this->createCreator();
        $order = app(StorefrontCheckout::class)->create($product->fresh()->load('creator'), null, [
            'name' => $student->name,
            'email' => $student->email,
        ]);

        $this->assertSame('paid', $order->fresh()->status);
        $this->assertTrue(app(\App\Courses\Services\EnrollmentService::class)->isEnrolled($course, $student->id));
    }
}
