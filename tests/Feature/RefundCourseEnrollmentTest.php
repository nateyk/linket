<?php

namespace Tests\Feature;

use App\Courses\Models\Enrollment;
use App\Models\User;
use App\Payments\Models\PaymentTransaction;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class RefundCourseEnrollmentTest extends TestCase
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

    public function testFullRefundRevokesCourseEnrollment(): void
    {
        $creator = $this->createCreator();
        $student = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        ActiveWorkspace::clearCache();

        $product = DigitalProduct::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Course ' . Str::random(6),
            'price_cents' => 10000,
            'currency' => 'ETB',
            'status' => 'approved',
            'type' => 'course',
        ]);
        $course = \App\Courses\Models\Course::firstOrCreate(
            ['digital_product_id' => $product->id],
            ['instructor_user_id' => $creator->id],
        );

        $order = StorefrontOrder::query()->create([
            'uuid' => (string) Str::uuid(),
            'digital_product_id' => $product->id,
            'creator_id' => $creator->id,
            'buyer_user_id' => $student->id,
            'buyer_email' => $student->email,
            'currency' => 'ETB',
            'gross_amount_cents' => 10000,
            'commission_bps' => 500,
            'platform_fee_cents' => 500,
            'creator_earnings_cents' => 9500,
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        $enrollment = app(\App\Courses\Services\EnrollmentService::class)->grantFromOrder($order->fresh('product.course'));
        $this->assertNotNull($enrollment);
        $this->assertSame('active', $enrollment->status);

        $transaction = PaymentTransaction::query()->create([
            'uuid' => (string) Str::uuid(),
            'gateway' => 'chapa',
            'payable_type' => StorefrontOrder::class,
            'payable_id' => $order->id,
            'purpose' => 'digital_product',
            'tx_ref' => 'refund-test-' . Str::random(10),
            'amount' => '100.00',
            'currency' => 'ETB',
            'status' => 'paid',
            'buyer_email' => $student->email,
            'verified_at' => now(),
        ]);

        // Create ledger entry so refund has available_at
        $order->load('product');
        app(\App\Storefront\DigitalProductFinance::class)->creditOrder($order);

        (new \App\Storefront\DigitalProductRefundService())->record($transaction, $creator->id, [
            'amount_cents' => 10000,
            'reason' => 'Full refund test',
            'external_reference' => 'ext-' . Str::random(8),
        ]);

        $enrollment = Enrollment::where('user_id', $student->id)->where('course_id', $course->id)->first();
        $this->assertNotNull($enrollment);
        $this->assertSame('revoked', $enrollment->status, 'Full refund should revoke enrollment');
        $this->assertFalse(app(\App\Courses\CourseAccess::class)->canAccessCourse($student, $course), 'Revoked enrollment should not have access');
    }

    public function testPartialRefundDoesNotRevokeEnrollment(): void
    {
        $creator = $this->createCreator();
        $student = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        ActiveWorkspace::clearCache();

        $product = DigitalProduct::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Course ' . Str::random(6),
            'price_cents' => 10000,
            'currency' => 'ETB',
            'status' => 'approved',
            'type' => 'course',
        ]);
        $course = \App\Courses\Models\Course::firstOrCreate(
            ['digital_product_id' => $product->id],
            ['instructor_user_id' => $creator->id],
        );

        $order = StorefrontOrder::query()->create([
            'uuid' => (string) Str::uuid(),
            'digital_product_id' => $product->id,
            'creator_id' => $creator->id,
            'buyer_user_id' => $student->id,
            'buyer_email' => $student->email,
            'currency' => 'ETB',
            'gross_amount_cents' => 10000,
            'commission_bps' => 500,
            'platform_fee_cents' => 500,
            'creator_earnings_cents' => 9500,
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        $enrollment = app(\App\Courses\Services\EnrollmentService::class)->grantFromOrder($order->fresh('product.course'));
        $this->assertSame('active', $enrollment->status);

        $transaction = PaymentTransaction::query()->create([
            'uuid' => (string) Str::uuid(),
            'gateway' => 'chapa',
            'payable_type' => StorefrontOrder::class,
            'payable_id' => $order->id,
            'purpose' => 'digital_product',
            'tx_ref' => 'refund-test-' . Str::random(10),
            'amount' => '100.00',
            'currency' => 'ETB',
            'status' => 'paid',
            'buyer_email' => $student->email,
            'verified_at' => now(),
        ]);
        $order->load('product');
        app(\App\Storefront\DigitalProductFinance::class)->creditOrder($order);

        (new \App\Storefront\DigitalProductRefundService())->record($transaction, $creator->id, [
            'amount_cents' => 4000,
            'reason' => 'Partial refund test',
            'external_reference' => 'ext-' . Str::random(8),
        ]);

        $enrollment = Enrollment::where('user_id', $student->id)->where('course_id', $course->id)->first();
        $this->assertSame('active', $enrollment->status, 'Partial refund should not revoke enrollment');
    }
}
