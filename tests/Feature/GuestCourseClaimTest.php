<?php

namespace Tests\Feature;

use App\Courses\Models\Enrollment;
use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Auth\Events\Verified;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class GuestCourseClaimTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        ActiveWorkspace::clearCache();
        parent::tearDown();
    }

    private function createCreator(bool $verified = true): User
    {
        $token = Str::lower(Str::random(12));
        return User::query()->forceCreate([
            'name' => 'Creator ' . $token,
            'username' => $token,
            'email' => "{$token}@example.test",
            'password' => bcrypt('password'),
            'email_verified_at' => $verified ? now() : null,
        ]);
    }

    public function testGuestCourseIsClaimedWhenEmailVerified(): void
    {
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        ActiveWorkspace::clearCache();

        $guestEmail = 'guest-claim-'.Str::lower(Str::random(8)).'@example.test';

        $product = DigitalProduct::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Course ' . Str::random(6),
            'price_cents' => 5000,
            'currency' => 'ETB',
            'status' => 'approved',
            'type' => 'course',
        ]);
        $course = \App\Courses\Models\Course::firstOrCreate(
            ['digital_product_id' => $product->id],
            ['instructor_user_id' => $creator->id],
        );

        // Guest order with no buyer_user_id (simulates pre-account purchase)
        $order = StorefrontOrder::query()->create([
            'uuid' => (string) Str::uuid(),
            'digital_product_id' => $product->id,
            'creator_id' => $creator->id,
            'buyer_user_id' => null,
            'buyer_email' => $guestEmail,
            'currency' => 'ETB',
            'gross_amount_cents' => 5000,
            'commission_bps' => 500,
            'platform_fee_cents' => 250,
            'creator_earnings_cents' => 4750,
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        $this->assertSame(0, Enrollment::where('course_id', $course->id)->count());

        // Now user registers with same email, initially unverified
        $guestUser = User::query()->forceCreate([
            'name' => 'Guest ' . Str::random(5),
            'username' => Str::lower(Str::random(10)),
            'email' => $guestEmail,
            'password' => bcrypt('password'),
            'email_verified_at' => null,
        ]);

        // No enrollment before verification
        $this->assertFalse(app(\App\Courses\Services\EnrollmentService::class)->isEnrolled($course, $guestUser->id));

        // Simulate email verification (Fortify dispatches Verified)
        $guestUser->forceFill(['email_verified_at' => now()])->save();
        event(new Verified($guestUser));

        $enrollment = Enrollment::where('user_id', $guestUser->id)->where('course_id', $course->id)->first();
        $this->assertNotNull($enrollment, 'Guest course should be claimed on email verification');
        $this->assertSame('active', $enrollment->status);
        $this->assertSame($order->id, $enrollment->storefront_order_id);

        // Order should be linked to user
        $this->assertSame($guestUser->id, $order->fresh()->buyer_user_id);
    }

    public function testGuestFreeCourseIsClaimedWhenEmailVerified(): void
    {
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        ActiveWorkspace::clearCache();

        $guestEmail = 'free-guest-'.Str::lower(Str::random(8)).'@example.test';

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

        $order = StorefrontOrder::query()->create([
            'uuid' => (string) Str::uuid(),
            'digital_product_id' => $product->id,
            'creator_id' => $creator->id,
            'buyer_user_id' => null,
            'buyer_email' => $guestEmail,
            'currency' => 'ETB',
            'gross_amount_cents' => 0,
            'commission_bps' => 500,
            'platform_fee_cents' => 0,
            'creator_earnings_cents' => 0,
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        $guestUser = User::query()->forceCreate([
            'name' => 'Guest ' . Str::random(5),
            'username' => Str::lower(Str::random(10)),
            'email' => $guestEmail,
            'password' => bcrypt('password'),
            'email_verified_at' => null,
        ]);

        $guestUser->forceFill(['email_verified_at' => now()])->save();
        event(new Verified($guestUser));

        $enrollment = Enrollment::where('user_id', $guestUser->id)->where('course_id', $course->id)->first();
        $this->assertNotNull($enrollment);
        $this->assertSame('active', $enrollment->status);
    }

    public function testUnverifiedUserDoesNotClaim(): void
    {
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        ActiveWorkspace::clearCache();

        $guestEmail = 'no-claim-'.Str::lower(Str::random(8)).'@example.test';

        $product = DigitalProduct::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Course ' . Str::random(6),
            'price_cents' => 5000,
            'currency' => 'ETB',
            'status' => 'approved',
            'type' => 'course',
        ]);
        $course = \App\Courses\Models\Course::firstOrCreate(
            ['digital_product_id' => $product->id],
            ['instructor_user_id' => $creator->id],
        );

        StorefrontOrder::query()->create([
            'uuid' => (string) Str::uuid(),
            'digital_product_id' => $product->id,
            'creator_id' => $creator->id,
            'buyer_user_id' => null,
            'buyer_email' => $guestEmail,
            'currency' => 'ETB',
            'gross_amount_cents' => 5000,
            'commission_bps' => 500,
            'platform_fee_cents' => 250,
            'creator_earnings_cents' => 4750,
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        $guestUser = User::query()->forceCreate([
            'name' => 'Guest ' . Str::random(5),
            'username' => Str::lower(Str::random(10)),
            'email' => $guestEmail,
            'password' => bcrypt('password'),
            'email_verified_at' => null,
        ]);

        // No event dispatched
        $this->assertSame(0, Enrollment::where('user_id', $guestUser->id)->where('course_id', $course->id)->count());
    }

    public function testClaimIsIdempotentOnDuplicateVerification(): void
    {
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        ActiveWorkspace::clearCache();

        $guestEmail = 'dup-'.Str::lower(Str::random(8)).'@example.test';

        $product = DigitalProduct::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Course ' . Str::random(6),
            'price_cents' => 5000,
            'currency' => 'ETB',
            'status' => 'approved',
            'type' => 'course',
        ]);
        $course = \App\Courses\Models\Course::firstOrCreate(
            ['digital_product_id' => $product->id],
            ['instructor_user_id' => $creator->id],
        );

        StorefrontOrder::query()->create([
            'uuid' => (string) Str::uuid(),
            'digital_product_id' => $product->id,
            'creator_id' => $creator->id,
            'buyer_user_id' => null,
            'buyer_email' => $guestEmail,
            'currency' => 'ETB',
            'gross_amount_cents' => 5000,
            'commission_bps' => 500,
            'platform_fee_cents' => 250,
            'creator_earnings_cents' => 4750,
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        $guestUser = User::query()->forceCreate([
            'name' => 'Guest ' . Str::random(5),
            'username' => Str::lower(Str::random(10)),
            'email' => $guestEmail,
            'password' => bcrypt('password'),
            'email_verified_at' => null,
        ]);
        $guestUser->forceFill(['email_verified_at' => now()])->save();
        event(new Verified($guestUser));
        event(new Verified($guestUser));

        $this->assertSame(1, Enrollment::where('user_id', $guestUser->id)->where('course_id', $course->id)->count());
    }
}
