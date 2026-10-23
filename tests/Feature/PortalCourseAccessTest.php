<?php

use App\Courses\Models\Course;
use App\Courses\Models\Enrollment;
use App\Courses\Services\EnrollmentService;
use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

afterEach(function () {
    ActiveWorkspace::clearCache();
});

function portalCourseFixture(string $buyerEmail = 'buyer@example.test'): array
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

    $product = DigitalProduct::query()->create([
        'workspace_id' => $workspace->id,
        'user_id' => $creator->id,
        'title' => 'Course '.Str::random(6),
        'price_cents' => 5000,
        'currency' => 'ETB',
        'status' => 'approved',
        'type' => 'course',
    ]);
    $course = Course::query()->firstOrCreate(
        ['digital_product_id' => $product->id],
        [
            'instructor_user_id' => $creator->id,
            'published_at' => now(),
        ],
    );
    if ($course->published_at === null) {
        $course->forceFill(['published_at' => now()])->save();
    }
    $order = StorefrontOrder::query()->create([
        'uuid' => (string) Str::uuid(),
        'digital_product_id' => $product->id,
        'creator_id' => $creator->id,
        'buyer_user_id' => null,
        'buyer_email' => $buyerEmail,
        'currency' => 'ETB',
        'gross_amount_cents' => 5000,
        'commission_bps' => 500,
        'platform_fee_cents' => 250,
        'creator_earnings_cents' => 4750,
        'status' => 'paid',
        'paid_at' => now(),
    ]);

    return [$creator, $product, $course, $order];
}

it('stores a portal enrollment without a user', function () {
    [, , $course, $order] = portalCourseFixture();
    $hash = hash('sha256', 'buyer@example.test');

    $enrollment = Enrollment::query()->create([
        'course_id' => $course->id,
        'user_id' => null,
        'portal_email_hash' => $hash,
        'storefront_order_id' => $order->id,
        'status' => 'active',
        'enrolled_at' => now(),
    ]);

    expect($enrollment->fresh()->portal_email_hash)->toBe($hash)
        ->and($enrollment->user_id)->toBeNull();
});

it('grants portal enrollment for paid guest course order', function () {
    [, , $course, $order] = portalCourseFixture('guest-portal@example.test');

    $enrollment = app(EnrollmentService::class)->grantFromPortalOrder($order);

    expect($enrollment)->not->toBeNull()
        ->and($enrollment->user_id)->toBeNull()
        ->and($enrollment->course_id)->toBe($course->id)
        ->and($enrollment->portal_email_hash)->toBe(hash('sha256', 'guest-portal@example.test'))
        ->and($enrollment->storefront_order_id)->toBe($order->id);

    $again = app(EnrollmentService::class)->grantFromPortalOrder($order->fresh());
    expect($again->id)->toBe($enrollment->id);
});

it('grantFromOrder creates portal enrollment when buyer has no user', function () {
    [, , $course, $order] = portalCourseFixture('no-user@example.test');

    $enrollment = app(EnrollmentService::class)->grantFromOrder($order);

    expect($enrollment)->not->toBeNull()
        ->and($enrollment->portal_email_hash)->toBe(hash('sha256', 'no-user@example.test'))
        ->and(Enrollment::query()->where('course_id', $course->id)->count())->toBe(1);
});

it('lists paid courses in my-portal library for portal session', function () {
    $email = 'library-'.Str::lower(Str::random(8)).'@example.test';
    [$creator, , $course, $order] = portalCourseFixture($email);
    app(EnrollmentService::class)->grantFromPortalOrder($order);

    $sessionToken = Str::random(80);
    $recovery = \App\Storefront\Models\DigitalProductOrderRecovery::query()->create([
        'uuid' => (string) Str::uuid(),
        'email' => $email,
        'email_hash' => hash('sha256', $email),
        'token_hash' => hash('sha256', Str::random(20)),
        'expires_at' => now()->subMinute(),
        'redeemed_at' => now(),
        'session_token_hash' => hash('sha256', $sessionToken),
        'session_expires_at' => now()->addDays(30),
    ]);

    config()->set('app.url', 'http://localhost');
    config()->set('sanctum.stateful', ['localhost']);

    $this->withCredentials()
        ->withHeader('Referer', 'http://localhost')
        ->withUnencryptedCookies([
            \App\Storefront\OrderRecoveryService::COOKIE => "{$recovery->uuid}.{$sessionToken}",
        ])
        ->getJson('/api/v1/public/my-portal/library')
        ->assertOk()
        ->assertJsonPath('courses.0.course_id', $course->id)
        ->assertJsonPath('courses.0.lessons_done', 0)
        ->assertJsonPath('courses.0.creator_name', $creator->name)
        ->assertJsonPath('orders.0.id', $order->uuid)
        ->assertJsonPath('orders.0.product_type', 'course');
});

function portalSessionCookie(string $email): string
{
    $sessionToken = Str::random(80);
    $recovery = \App\Storefront\Models\DigitalProductOrderRecovery::query()->create([
        'uuid' => (string) Str::uuid(),
        'email' => $email,
        'email_hash' => hash('sha256', $email),
        'token_hash' => hash('sha256', Str::random(20)),
        'expires_at' => now()->subMinute(),
        'redeemed_at' => now(),
        'session_token_hash' => hash('sha256', $sessionToken),
        'session_expires_at' => now()->addDays(30),
    ]);

    return "{$recovery->uuid}.{$sessionToken}";
}

function portalStateful(): Tests\TestCase
{
    config()->set('app.url', 'http://localhost');
    config()->set('sanctum.stateful', ['localhost']);

    return test()->withCredentials()->withHeader('Referer', 'http://localhost');
}

it('lets a portal session load and complete a lesson', function () {
    $email = 'learn-'.Str::lower(Str::random(8)).'@example.test';
    [, , $course, $order] = portalCourseFixture($email);
    app(EnrollmentService::class)->grantFromPortalOrder($order);

    $chapter = \App\Courses\Models\Chapter::query()->create([
        'course_id' => $course->id,
        'title' => 'Chapter 1',
        'sort_order' => 0,
    ]);
    $lesson = \App\Courses\Models\Lesson::query()->create([
        'chapter_id' => $chapter->id,
        'course_id' => $course->id,
        'title' => 'Lesson 1',
        'status' => 'published',
        'sort_order' => 0,
        'content_type' => 'readable',
        'content' => '<p>Hello</p>',
    ]);

    $cookie = portalSessionCookie($email);

    portalStateful()
        ->withUnencryptedCookies([\App\Storefront\OrderRecoveryService::COOKIE => $cookie])
        ->getJson("/api/v1/public/my-portal/courses/{$course->id}/lessons/{$lesson->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $lesson->id);

    portalStateful()
        ->withUnencryptedCookies([\App\Storefront\OrderRecoveryService::COOKIE => $cookie])
        ->postJson("/api/v1/public/my-portal/courses/{$course->id}/lessons/{$lesson->id}/complete")
        ->assertOk()
        ->assertJsonPath('data.lesson_id', $lesson->id);

    expect(\App\Courses\Models\LessonProgress::query()
        ->where('portal_email_hash', hash('sha256', $email))
        ->where('lesson_id', $lesson->id)
        ->exists())->toBeTrue();
});

it('denies another email portal session from accessing the course', function () {
    $ownerEmail = 'owner-'.Str::lower(Str::random(8)).'@example.test';
    $intruderEmail = 'intruder-'.Str::lower(Str::random(8)).'@example.test';
    [, , $course, $order] = portalCourseFixture($ownerEmail);
    app(EnrollmentService::class)->grantFromPortalOrder($order);

    portalStateful()
        ->withUnencryptedCookies([
            \App\Storefront\OrderRecoveryService::COOKIE => portalSessionCookie($intruderEmail),
        ])
        ->getJson("/api/v1/public/my-portal/courses/{$course->id}")
        ->assertForbidden();
});

it('merges portal lesson progress onto the user when claimed', function () {
    $email = 'claim-'.Str::lower(Str::random(8)).'@example.test';
    [, , $course, $order] = portalCourseFixture($email);
    app(EnrollmentService::class)->grantFromPortalOrder($order);

    $chapter = \App\Courses\Models\Chapter::query()->create([
        'course_id' => $course->id,
        'title' => 'Chapter 1',
        'sort_order' => 0,
    ]);
    $lesson = \App\Courses\Models\Lesson::query()->create([
        'chapter_id' => $chapter->id,
        'course_id' => $course->id,
        'title' => 'Lesson 1',
        'status' => 'published',
        'sort_order' => 0,
        'content_type' => 'readable',
    ]);

    $hash = hash('sha256', $email);
    \App\Courses\Models\LessonProgress::query()->create([
        'user_id' => null,
        'portal_email_hash' => $hash,
        'course_id' => $course->id,
        'lesson_id' => $lesson->id,
        'completed_at' => now(),
    ]);

    $user = User::query()->forceCreate([
        'name' => 'Claimer',
        'username' => Str::lower(Str::random(10)),
        'email' => $email,
        'password' => bcrypt('password'),
        'email_verified_at' => now(),
    ]);

    app(\App\Courses\Services\CourseClaimService::class)->claimForUser($user);

    expect(Enrollment::query()->where('user_id', $user->id)->where('course_id', $course->id)->exists())->toBeTrue()
        ->and(\App\Courses\Models\LessonProgress::query()
            ->where('user_id', $user->id)
            ->where('lesson_id', $lesson->id)
            ->whereNull('portal_email_hash')
            ->exists())->toBeTrue()
        ->and($order->fresh()->buyer_user_id)->toBe($user->id);
});

it('finds paid orders for mixed-case buyer emails', function () {
    [, , , $order] = portalCourseFixture('Buyer.CASE@Example.TEST');

    $recovery = \App\Storefront\Models\DigitalProductOrderRecovery::query()->create([
        'uuid' => (string) Str::uuid(),
        'email' => 'buyer.case@example.test',
        'email_hash' => hash('sha256', 'buyer.case@example.test'),
        'token_hash' => hash('sha256', 'x'),
        'expires_at' => now()->addMinute(),
        'session_token_hash' => hash('sha256', 'token'),
        'session_expires_at' => now()->addDays(30),
    ]);

    $orders = app(\App\Storefront\OrderRecoveryService::class)->paidOrders($recovery)->get();
    expect($orders->pluck('id'))->toContain($order->id);
});
