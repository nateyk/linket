# Product Approval Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the digital-product review lifecycle so updates are governed by the correct policy, live products stay sellable during review, and every approval/rejection/edit is auditable and visible as an "Updated" queue.

**Architecture:** `status` remains the first-approval lifecycle. A nullable `review_requested_at` / `review_requested_by` flag on `digital_products` marks an unreviewed edit to an approved product; an append-only `digital_product_review_events` table records every transition. The `approved → draft` demotion is removed everywhere. Admin index gains `scope=updated`; approve/reject handle both initial and update states.

**Tech Stack:** Laravel 11 (PHP 8.2), Eloquent, Pest/PHPUnit feature tests, React 19 + TypeScript (react-router, TanStack Query, nuqs, Base UI via `@shadcn`), Vitest, Vite.

**Spec:** `docs/superpowers/specs/2026-09-18-product-approval-pipeline-design.md`

## Global Constraints

- Work on branch `feat/product-approval-pipeline` (already checked out off `origin/main`).
- Post-moderation: an edited live product stays `status = 'approved'` and sellable until a reviewer acts.
- `approved_at` is **never** cleared; `approved_at !== null` means "was approved at least once" and selects the update policy.
- Every state change writes a `digital_product_review_events` row in the same database transaction as the state change.
- `Model::preventLazyLoading()` is active outside production — eager-load relations, never lazy-load in a loop.
- Strings in TSX go through `<Trans message="..." />`; currency through `formatMoney`; lucide icons use `size-*` classes.
- Verification before any PR: `npx tsc --noEmit --skipLibCheck`, `npm run test`, `npm run build`, `ddev exec ./vendor/bin/pest`; then `git restore public/build/manifest.json`.
- Do not commit, push, or open a PR unless the user explicitly asks. Merge only with explicit approval.

---

## File Structure

**Create**
- `database/migrations/2026_09_18_000001_add_review_requested_fields_to_digital_products.php`
- `database/migrations/2026_09_18_000002_create_digital_product_review_events_table.php`
- `app/Storefront/Models/DigitalProductReviewEvent.php`
- `app/Storefront/ProductReviewHistory.php`
- `tests/Feature/ProductApprovalPipelineTest.php`
- `tests/Feature/AdminProductReviewQueueTest.php`
- `resources/client/dashboard/digital-products/digital-products-page.test.ts`
- `resources/client/admin/digital-products/admin-product-review-queue.test.ts`

**Modify**
- `app/Storefront/Models/DigitalProduct.php`
- `app/Storefront/DigitalProductMutationService.php`
- `app/Storefront/Controllers/DigitalProductsController.php`
- `app/Storefront/Controllers/AdminDigitalProductsController.php`
- `app/Storefront/Resources/DigitalProductResource.php`
- `app/Courses/Services/CourseService.php`
- `app/Courses/Controllers/CoursesController.php`
- `tests/Feature/ProductSettingsReviewPolicyTest.php` (two stale assertions)
- `resources/client/dashboard/digital-products/digital-products-page.tsx`
- `resources/client/admin/digital-products/admin-digital-products-queries.ts`
- `resources/client/admin/digital-products/admin-digital-products-page.tsx`
- `resources/client/admin/digital-products/admin-digital-products-datatable-columns.tsx`

---

## Task 1: Schema, event model, product helpers

**Files:**
- Create: `database/migrations/2026_09_18_000001_add_review_requested_fields_to_digital_products.php`
- Create: `database/migrations/2026_09_18_000002_create_digital_product_review_events_table.php`
- Create: `app/Storefront/Models/DigitalProductReviewEvent.php`
- Create: `tests/Feature/ProductApprovalPipelineTest.php`
- Modify: `app/Storefront/Models/DigitalProduct.php`

**Interfaces:**
- Consumes: nothing.
- Produces: `DigitalProduct::$review_requested_at` (Carbon|null), `DigitalProduct::$review_requested_by` (int|null), `DigitalProduct::hasPendingUpdate(): bool`, `DigitalProduct::reviewEvents(): HasMany`, `DigitalProduct::reviewRequestedBy(): BelongsTo`, `DigitalProductReviewEvent`.

- [ ] **Step 1: Write the migrations**

`database/migrations/2026_09_18_000001_add_review_requested_fields_to_digital_products.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('digital_products', function (Blueprint $table) {
            $table->timestamp('review_requested_at')->nullable()->after('approved_at')->index();
            $table->foreignId('review_requested_by')->nullable()->after('review_requested_at')
                ->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('digital_products', function (Blueprint $table) {
            $table->dropIndex(['review_requested_at']);
            $table->dropConstrainedForeignId('review_requested_by');
            $table->dropColumn('review_requested_at');
        });
    }
};
```

`database/migrations/2026_09_18_000002_create_digital_product_review_events_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('digital_product_review_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('digital_product_id')->constrained('digital_products')->cascadeOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('actor_role', 20);
            $table->string('event', 40)->index();
            $table->string('from_status')->nullable();
            $table->string('to_status')->nullable();
            $table->text('reason')->nullable();
            $table->json('meta')->nullable();
            $table->timestamp('created_at')->nullable();
            $table->index(['digital_product_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('digital_product_review_events');
    }
};
```

- [ ] **Step 2: Create the event model**

`app/Storefront/Models/DigitalProductReviewEvent.php`

```php
<?php

namespace App\Storefront\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DigitalProductReviewEvent extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'digital_product_id',
        'actor_id',
        'actor_role',
        'event',
        'from_status',
        'to_status',
        'reason',
        'meta',
    ];

    protected $casts = [
        'meta' => 'array',
        'created_at' => 'datetime',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(DigitalProduct::class, 'digital_product_id');
    }
}
```

- [ ] **Step 3: Extend the DigitalProduct model**

In `app/Storefront/Models/DigitalProduct.php`:

Add `'review_requested_at', 'review_requested_by',` to `$fillable` (after `'approved_at',`), and add `'review_requested_at' => 'datetime'` to `$casts`.

Add these methods (after `isApproved()`):

```php
    public function reviewRequestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'review_requested_by');
    }

    public function reviewEvents(): HasMany
    {
        return $this->hasMany(DigitalProductReviewEvent::class);
    }

    public function hasPendingUpdate(): bool
    {
        return $this->status === 'approved' && $this->review_requested_at !== null;
    }
```

(`BelongsTo` and `HasMany` are already imported in the file.)

- [ ] **Step 4: Write the failing test**

`tests/Feature/ProductApprovalPipelineTest.php` (initial file):

```php
<?php

namespace Tests\Feature;

use App\Biolinks\Models\Biolink;
use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use Common\Files\FileEntry;
use Common\Settings\Models\Setting;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\Models\Workspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProductApprovalPipelineTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        Setting::query()->where('name', 'like', 'product.%')->delete();
        settings()->loadSettings();
        ActiveWorkspace::clearCache();
        parent::tearDown();
    }

    public function testProductReviewHelpersAndCasts(): void
    {
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator, [
            'status' => 'approved',
            'approved_at' => now(),
            'review_requested_at' => now(),
            'review_requested_by' => $creator->id,
        ]);

        $fresh = DigitalProduct::find($product->id);
        $this->assertInstanceOf(\Illuminate\Support\Carbon::class, $fresh->review_requested_at);
        $this->assertTrue($fresh->hasPendingUpdate());

        $fresh->update(['status' => 'draft']);
        $this->assertFalse($fresh->fresh()->hasPendingUpdate());
    }

    public function testReviewEventsRelationAndMetaCast(): void
    {
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator);

        $product->reviewEvents()->create([
            'actor_id' => $creator->id,
            'actor_role' => 'creator',
            'event' => 'created',
            'from_status' => null,
            'to_status' => 'draft',
            'meta' => ['changed' => ['title']],
        ]);

        $event = $product->reviewEvents()->first();
        $this->assertSame('created', $event->event);
        $this->assertSame(['changed' => ['title']], $event->meta);
        $this->assertSame($creator->id, $event->actor_id);
    }

    private function creatorContext(): array
    {
        $creator = $this->createCreator();
        $workspace = $creator->workspaces()->first();
        ActiveWorkspace::clearCache();

        return [$creator, $workspace];
    }

    private function createCreator(): User
    {
        $user = User::query()->forceCreate([
            'name' => 'Creator ' . Str::random(6),
            'username' => Str::lower(Str::random(10)),
            'email' => Str::random(8) . '@example.test',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);

        if (!Workspace::query()->where('owner_id', $user->id)->where('is_personal', true)->exists()) {
            (new CreateWorkspace())->createPersonalWorkspace($user);
        }

        return $user;
    }

    private function createFile(User $creator, Workspace $workspace): FileEntry
    {
        return FileEntry::query()->create([
            'name' => 'test.pdf',
            'file_name' => 'test.pdf',
            'mime' => 'application/pdf',
            'extension' => 'pdf',
            'file_size' => 100,
            'workspace_id' => $workspace->id,
            'owner_id' => $creator->id,
        ]);
    }

    private function product(Workspace $workspace, User $creator, array $attributes = []): DigitalProduct
    {
        return DigitalProduct::query()->create(array_merge([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Product ' . Str::random(6),
            'price_cents' => 1000,
            'currency' => 'ETB',
            'type' => 'digital',
        ], $attributes));
    }

    private function stateful(): static
    {
        $csrfToken = 'test-csrf-token';

        return $this->withSession(['_token' => $csrfToken])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', $csrfToken);
    }
}
```

- [ ] **Step 5: Run migrations and the test**

Run: `ddev exec php artisan migrate`
Expected: two new migrations run without error.

Run: `ddev exec ./vendor/bin/pest tests/Feature/ProductApprovalPipelineTest.php`
Expected: 2 passed.

- [ ] **Step 6: Commit**

```bash
git add database/migrations/2026_09_18_000001_add_review_requested_fields_to_digital_products.php \
        database/migrations/2026_09_18_000002_create_digital_product_review_events_table.php \
        app/Storefront/Models/DigitalProductReviewEvent.php \
        app/Storefront/Models/DigitalProduct.php \
        tests/Feature/ProductApprovalPipelineTest.php
git commit -m "feat(products): add review-request flag and review event model"
```

---

## Task 2: ProductReviewHistory audit writer

**Files:**
- Create: `app/Storefront/ProductReviewHistory.php`
- Modify: `tests/Feature/ProductApprovalPipelineTest.php`

**Interfaces:**
- Consumes: `DigitalProduct::reviewEvents()`, `DigitalProductReviewEvent`.
- Produces: `ProductReviewHistory::record(DigitalProduct $product, string $event, ?string $from, ?string $to, ?User $actor, string $actorRole, ?string $reason = null, array $meta = []): DigitalProductReviewEvent`.

- [ ] **Step 1: Write the failing test**

Insert this method into `ProductApprovalPipelineTest` before the `private function creatorContext()` line:

```php
    public function testRecordWritesActorRoleAndMeta(): void
    {
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator);

        $history = app(\App\Storefront\ProductReviewHistory::class);
        $history->record($product, 'created', null, 'draft', $creator, 'creator');
        $history->record($product, 'approved', 'pending_approval', 'approved', $creator, 'admin');
        $history->record($product, 'updated', 'approved', 'approved', null, 'system', null, ['changed' => ['title']]);

        $events = $product->reviewEvents()->orderBy('id')->get();
        $this->assertSame(['creator', 'admin', 'system'], $events->pluck('actor_role')->all());
        $this->assertSame(['changed' => ['title']], $events->last()->meta);
        $this->assertNull($events->last()->actor_id);
        $this->assertSame('approved', $events->last()->to_status);
    }

    public function testRecordForcesSystemRoleWhenNoActor(): void
    {
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator);

        app(\App\Storefront\ProductReviewHistory::class)
            ->record($product, 'updated', 'approved', 'approved', null, 'creator');

        $this->assertSame('system', $product->reviewEvents()->first()->actor_role);
    }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `ddev exec ./vendor/bin/pest tests/Feature/ProductApprovalPipelineTest.php --filter=testRecord`
Expected: FAIL with "Target class [App\Storefront\ProductReviewHistory] does not exist".

- [ ] **Step 3: Write the service**

`app/Storefront/ProductReviewHistory.php`

```php
<?php

namespace App\Storefront;

use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\DigitalProductReviewEvent;

final class ProductReviewHistory
{
    public function record(
        DigitalProduct $product,
        string $event,
        ?string $from,
        ?string $to,
        ?User $actor,
        string $actorRole,
        ?string $reason = null,
        array $meta = [],
    ): DigitalProductReviewEvent {
        return $product->reviewEvents()->create([
            'actor_id' => $actor?->id,
            'actor_role' => $actor === null ? 'system' : $actorRole,
            'event' => $event,
            'from_status' => $from,
            'to_status' => $to,
            'reason' => $reason,
            'meta' => $meta === [] ? null : $meta,
        ]);
    }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `ddev exec ./vendor/bin/pest tests/Feature/ProductApprovalPipelineTest.php --filter=testRecord`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add app/Storefront/ProductReviewHistory.php tests/Feature/ProductApprovalPipelineTest.php
git commit -m "feat(products): add review history audit writer"
```

---

## Task 3: Update-aware submit policy

**Files:**
- Modify: `app/Storefront/Controllers/DigitalProductsController.php`
- Modify: `tests/Feature/ProductApprovalPipelineTest.php`

**Interfaces:**
- Consumes: `ProductReviewHistory::record(...)`.
- Produces: `DigitalProductsController::submit()` selects `updatingRequiresReview()` when `approved_at !== null`, otherwise `addingRequiresReview()` (courses: OR `config('store.courses_require_approval')`).

- [ ] **Step 1: Write the failing test**

Insert into `ProductApprovalPipelineTest` before the `private function creatorContext()` line:

```php
    public function testPreviouslyApprovedResubmissionUsesUpdatePolicy(): void
    {
        settings()->save([
            'product.adding_requires_review' => 0,
            'product.updating_requires_review' => 1,
        ]);
        [$creator, $workspace] = $this->creatorContext();
        $file = $this->createFile($creator, $workspace);
        $product = $this->product($workspace, $creator, [
            'status' => 'rejected',
            'approved_at' => now(),
        ]);
        $product->files()->attach($file->id);

        $this->stateful()->actingAs($creator)
            ->postJson("/api/v1/digital-products/{$product->id}/submit")
            ->assertOk();

        $this->assertSame('pending_approval', $product->fresh()->status);
        $this->assertDatabaseHas('digital_product_review_events', [
            'digital_product_id' => $product->id,
            'event' => 'update_submitted',
            'actor_role' => 'creator',
        ]);
    }

    public function testFirstSubmissionStillUsesAddingPolicy(): void
    {
        settings()->save([
            'product.adding_requires_review' => 0,
            'product.updating_requires_review' => 1,
        ]);
        [$creator, $workspace] = $this->creatorContext();
        $file = $this->createFile($creator, $workspace);
        $product = $this->product($workspace, $creator, ['status' => 'draft']);
        $product->files()->attach($file->id);

        $this->stateful()->actingAs($creator)
            ->postJson("/api/v1/digital-products/{$product->id}/submit")
            ->assertOk();

        $this->assertSame('approved', $product->fresh()->status);
        $this->assertDatabaseHas('digital_product_review_events', [
            'digital_product_id' => $product->id,
            'event' => 'submitted',
            'actor_role' => 'creator',
        ]);
    }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `ddev exec ./vendor/bin/pest tests/Feature/ProductApprovalPipelineTest.php --filter=testPreviouslyApprovedResubmissionUsesUpdatePolicy`
Expected: FAIL — status is `approved` (adding policy auto-approved) instead of `pending_approval`.

- [ ] **Step 3: Rewrite submit()**

In `app/Storefront/Controllers/DigitalProductsController.php`, add to imports:

```php
use App\Storefront\ProductReviewHistory;
use Illuminate\Support\Facades\DB;
```

Replace the entire `submit()` method with:

```php
    public function submit(Request $request, DigitalProduct $digitalProduct)
    {
        $this->assertOwner($digitalProduct, $request);
        abort_unless(
            in_array($digitalProduct->status, ['draft', 'rejected'], true),
            422,
            __('Only draft or rejected products can be submitted for review.'),
        );

        $policy = app(ProductSettings::class);
        $wasApproved = $digitalProduct->approved_at !== null;

        if ($digitalProduct->isCourse()) {
            $course = $digitalProduct->course ?? app(\App\Courses\Services\CourseService::class)->ensureForProduct($digitalProduct);
            $hasPublished = \App\Courses\Models\Lesson::where('course_id', $course->id)->where('status', 'published')->exists();
            abort_unless($course->chapters()->exists() && $hasPublished, 422, __('Add at least one chapter and one published lesson before submitting.'));

            $requiresReview = $wasApproved
                ? ($policy->updatingRequiresReview() || (bool) config('store.courses_require_approval'))
                : $policy->addingRequiresReviewForCourse();

            $course->update(['published_at' => now()]);

            return new DigitalProductResource(
                $this->applySubmission($digitalProduct, $requiresReview, $wasApproved, $request),
            );
        }

        abort_if($digitalProduct->files()->doesntExist(), 422, __('Add at least one downloadable file before submitting.'));

        $requiresReview = $wasApproved
            ? $policy->updatingRequiresReview()
            : $policy->addingRequiresReview();

        return new DigitalProductResource(
            $this->applySubmission($digitalProduct, $requiresReview, $wasApproved, $request),
        );
    }

    private function applySubmission(
        DigitalProduct $product,
        bool $requiresReview,
        bool $wasApproved,
        Request $request,
    ): DigitalProduct {
        $from = $product->status;

        DB::transaction(function () use ($product, $requiresReview, $wasApproved, $from, $request): void {
            if ($requiresReview) {
                $product->update([
                    'status' => 'pending_approval',
                    'rejection_reason' => null,
                ]);
            } else {
                $product->update([
                    'status' => 'approved',
                    'approved_at' => now(),
                    'rejection_reason' => null,
                ]);
            }

            app(ProductReviewHistory::class)->record(
                $product,
                $wasApproved ? 'update_submitted' : 'submitted',
                $from,
                $product->status,
                $request->user(),
                'creator',
            );
        });

        return $product->fresh();
    }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `ddev exec ./vendor/bin/pest tests/Feature/ProductApprovalPipelineTest.php`
Expected: all pass (including the two new tests).

- [ ] **Step 5: Commit**

```bash
git add app/Storefront/Controllers/DigitalProductsController.php tests/Feature/ProductApprovalPipelineTest.php
git commit -m "fix(products): choose review policy from prior approval on submit"
```

---

## Task 4: Remove draft demotion; queue update review

**Files:**
- Modify: `app/Storefront/DigitalProductMutationService.php`
- Modify: `app/Storefront/Controllers/DigitalProductsController.php`
- Modify: `tests/Feature/ProductApprovalPipelineTest.php`
- Modify: `tests/Feature/ProductSettingsReviewPolicyTest.php`

**Interfaces:**
- Consumes: `ProductReviewHistory::record(...)`, `ProductSettings::updatingRequiresReview()`.
- Produces: `DigitalProductMutationService::update(DigitalProduct $product, array $data, ?int $maxUploadBytes, ?User $actor = null): DigitalProduct`. Editing an approved product sets the flag instead of demoting.

- [ ] **Step 1: Write the failing tests**

Insert into `ProductApprovalPipelineTest` before `private function creatorContext()`:

```php
    public function testEditingApprovedProductQueuesReviewAndStaysLive(): void
    {
        settings()->save(['product.updating_requires_review' => 1]);
        [$creator, $workspace, $product, $file, $biolink] = $this->approvedProductWithStore();

        $this->stateful()->actingAs($creator)->putJson(
            "/api/v1/digital-products/{$product->id}",
            ['title' => 'Edited live', 'price_cents' => 1000, 'currency' => 'ETB', 'file_ids' => [$file->id]],
        )->assertOk();

        $fresh = $product->fresh();
        $this->assertSame('approved', $fresh->status);
        $this->assertNotNull($fresh->review_requested_at);
        $this->assertSame($creator->id, $fresh->review_requested_by);
        $this->assertDatabaseHas('digital_product_review_events', [
            'digital_product_id' => $product->id,
            'event' => 'updated',
            'actor_role' => 'creator',
        ]);

        $listed = $this->stateful()->getJson("/api/v1/public/stores/{$biolink->id}/digital-products");
        $listed->assertOk();
        $this->assertNotNull(collect($listed->json('data'))->firstWhere('id', $product->id));
    }

    public function testEditingApprovedProductWithoutUpdateReviewStaysClean(): void
    {
        settings()->save(['product.updating_requires_review' => 0]);
        [$creator, $workspace, $product, $file] = $this->approvedProductWithStore();

        $this->stateful()->actingAs($creator)->putJson(
            "/api/v1/digital-products/{$product->id}",
            ['title' => 'Edited live', 'price_cents' => 1000, 'currency' => 'ETB', 'file_ids' => [$file->id]],
        )->assertOk();

        $fresh = $product->fresh();
        $this->assertSame('approved', $fresh->status);
        $this->assertNull($fresh->review_requested_at);
    }

    public function testSecondEditDoesNotResetReviewRequestedAt(): void
    {
        settings()->save(['product.updating_requires_review' => 1]);
        [$creator, $workspace] = $this->creatorContext();
        $file = $this->createFile($creator, $workspace);
        $queuedAt = now()->subHour()->startOfSecond();
        $product = $this->product($workspace, $creator, [
            'status' => 'approved',
            'approved_at' => now(),
            'review_requested_at' => $queuedAt,
            'review_requested_by' => $creator->id,
        ]);
        $product->files()->attach($file->id);

        $this->stateful()->actingAs($creator)->putJson(
            "/api/v1/digital-products/{$product->id}",
            ['title' => 'Second edit', 'price_cents' => 1000, 'currency' => 'ETB', 'file_ids' => [$file->id]],
        )->assertOk();

        $this->assertTrue($queuedAt->equalTo($product->fresh()->review_requested_at));
    }

    public function testCreatingProductRecordsCreatedEvent(): void
    {
        settings()->save(['product.adding_requires_review' => 1]);
        [$creator, $workspace] = $this->creatorContext();
        $file = $this->createFile($creator, $workspace);

        $response = $this->stateful()->actingAs($creator)->postJson('/api/v1/digital-products', [
            'title' => 'New product',
            'price_cents' => 1000,
            'currency' => 'ETB',
            'file_ids' => [$file->id],
        ]);
        $response->assertCreated();

        $this->assertDatabaseHas('digital_product_review_events', [
            'digital_product_id' => $response->json('data.id'),
            'event' => 'created',
            'actor_role' => 'creator',
        ]);
    }
```

Add this helper to `ProductApprovalPipelineTest` (after the `private function product(...)` helper):

```php
    private function approvedProductWithStore(): array
    {
        [$creator, $workspace] = $this->creatorContext();
        $file = $this->createFile($creator, $workspace);
        $biolink = Biolink::query()->create([
            'back_half' => Str::random(8),
            'name' => 'Test Storefront',
            'user_id' => $creator->id,
            'workspace_id' => $workspace->id,
        ]);
        $product = $this->product($workspace, $creator, [
            'status' => 'approved',
            'approved_at' => now(),
        ]);
        $product->files()->attach($file->id);
        $product->biolinks()->attach($biolink->id);

        return [$creator, $workspace, $product, $file, $biolink];
    }
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `ddev exec ./vendor/bin/pest tests/Feature/ProductApprovalPipelineTest.php --filter=testEditingApprovedProductQueuesReviewAndStaysLive`
Expected: FAIL — status is `draft`.

- [ ] **Step 3: Rewrite the mutation service update path**

In `app/Storefront/DigitalProductMutationService.php`, add `use App\Storefront\ProductReviewHistory;` (same namespace `App\Storefront`, so no import needed) — the class is in `App\Storefront`, so reference `ProductReviewHistory` directly.

Replace `update()` with:

```php
    public function update(DigitalProduct $product, array $data, ?int $maxUploadBytes, ?User $actor = null): DigitalProduct
    {
        return DB::transaction(function () use ($product, $data, $maxUploadBytes, $actor): DigitalProduct {
            $type = $data['type'] ?? $product->type ?? 'digital';
            $product->update([
                ...Arr::except($data, ['file_ids', 'biolink_ids', 'type']),
                'type' => $type,
                'currency' => $data['currency'] ?? $product->currency,
            ]);

            $changed = array_values(array_diff(array_keys($product->getChanges()), ['updated_at']));
            $this->queueUpdateReviewIfNeeded($product, $actor);

            $this->assertCoverBelongsToWorkspace($product);
            $this->syncProductFiles($product, $data, $type, $maxUploadBytes);
            if ($type === 'course') {
                $this->courses->ensureForProduct($product->fresh());
            }
            $this->visibility->sync(
                $product,
                $data['biolink_ids'] ?? $product->biolinks()->pluck('biolinks.id')->all(),
            );

            if ($changed !== []) {
                app(ProductReviewHistory::class)->record(
                    $product->fresh(),
                    'updated',
                    $product->status,
                    $product->status,
                    $actor,
                    'creator',
                    null,
                    ['changed' => $changed],
                );
            }

            return $product->fresh()->load(['files', 'cover', 'biolinks', 'course']);
        });
    }

    private function queueUpdateReviewIfNeeded(DigitalProduct $product, ?User $actor): void
    {
        if ($product->status !== 'approved' || !app(ProductSettings::class)->updatingRequiresReview()) {
            return;
        }

        if ($product->review_requested_at !== null) {
            return;
        }

        $product->update([
            'review_requested_at' => now(),
            'review_requested_by' => $actor?->id ?? $product->user_id,
        ]);
    }
```

Note: `ProductReviewHistory` is in the same `App\Storefront` namespace as this service, so no import is required. `User` is already imported.

Also record the initial creation event. In `create()`, immediately before the final `return $product->fresh()->load([...]);`, add:

```php
            app(ProductReviewHistory::class)->record(
                $product,
                'created',
                null,
                $product->status,
                $creator,
                'creator',
            );
```

- [ ] **Step 4: Pass the actor from the controller**

In `app/Storefront/Controllers/DigitalProductsController.php::update()`, change the mutation call to:

```php
        $product = $this->mutations->update(
            $digitalProduct,
            $data,
            $entitlements->limit($creator, 'max_upload_bytes'),
            $creator,
        );
```

- [ ] **Step 5: Update the two stale policy tests**

In `tests/Feature/ProductSettingsReviewPolicyTest.php`:

Rename `testUpdateRevertsToDraftWhenUpdatingReviewEnabled` to `testUpdateQueuesReviewWhenUpdatingReviewEnabled` and change its final assertions from:

```php
        $this->assertSame('draft', DigitalProduct::find($productId)->status);
```

to:

```php
        $updated = DigitalProduct::find($productId);
        $this->assertSame('approved', $updated->status);
        $this->assertNotNull($updated->review_requested_at);
```

In `testDefaultsRequireReview`, change the final assertion from:

```php
        $this->assertSame('draft', DigitalProduct::find($productId)->status);
```

to:

```php
        $updated = DigitalProduct::find($productId);
        $this->assertSame('approved', $updated->status);
        $this->assertNotNull($updated->review_requested_at);
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `ddev exec ./vendor/bin/pest tests/Feature/ProductApprovalPipelineTest.php tests/Feature/ProductSettingsReviewPolicyTest.php`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add app/Storefront/DigitalProductMutationService.php \
        app/Storefront/Controllers/DigitalProductsController.php \
        tests/Feature/ProductApprovalPipelineTest.php \
        tests/Feature/ProductSettingsReviewPolicyTest.php
git commit -m "feat(products): keep edited products live and queue update review"
```

---

## Task 5: Course content changes queue review instead of unpublishing

**Files:**
- Modify: `app/Courses/Services/CourseService.php`
- Modify: `app/Courses/Controllers/CoursesController.php`
- Modify: `tests/Feature/ProductApprovalPipelineTest.php`

**Interfaces:**
- Consumes: `ProductReviewHistory::record(...)`.
- Produces: `CourseService::revertApprovalForContentChange(Course $course): void` sets the flag and leaves the course published.

- [ ] **Step 1: Write the failing tests**

Insert into `ProductApprovalPipelineTest` before `private function creatorContext()`:

```php
    public function testCourseContentChangeQueuesReviewAndStaysPublished(): void
    {
        settings()->save(['product.updating_requires_review' => 1]);
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator, [
            'status' => 'approved',
            'approved_at' => now(),
            'type' => 'course',
        ]);
        $course = \App\Courses\Models\Course::query()->create([
            'digital_product_id' => $product->id,
            'instructor_user_id' => $creator->id,
            'published_at' => now(),
        ]);

        app(\App\Courses\Services\CourseService::class)->revertApprovalForContentChange($course);

        $this->assertSame('approved', $product->fresh()->status);
        $this->assertNotNull($product->fresh()->review_requested_at);
        $this->assertNotNull($course->fresh()->published_at);
        $this->assertDatabaseHas('digital_product_review_events', [
            'digital_product_id' => $product->id,
            'event' => 'updated',
        ]);
    }

    public function testCourseContentChangeWithoutUpdateReviewStaysClean(): void
    {
        settings()->save(['product.updating_requires_review' => 0]);
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator, [
            'status' => 'approved',
            'approved_at' => now(),
            'type' => 'course',
        ]);
        $course = \App\Courses\Models\Course::query()->create([
            'digital_product_id' => $product->id,
            'instructor_user_id' => $creator->id,
            'published_at' => now(),
        ]);

        app(\App\Courses\Services\CourseService::class)->revertApprovalForContentChange($course);

        $this->assertSame('approved', $product->fresh()->status);
        $this->assertNull($product->fresh()->review_requested_at);
        $this->assertNotNull($course->fresh()->published_at);
    }
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `ddev exec ./vendor/bin/pest tests/Feature/ProductApprovalPipelineTest.php --filter=testCourseContentChangeQueuesReviewAndStaysPublished`
Expected: FAIL — status is `draft` and `published_at` is null.

- [ ] **Step 3: Update CourseService**

In `app/Courses/Services/CourseService.php`, replace `revertApprovalForContentChange()` with:

```php
    public function revertApprovalForContentChange(Course $course): void
    {
        if (!app(\App\Storefront\ProductSettings::class)->updatingRequiresReview()) {
            return;
        }

        $product = $course->product;
        if (!$product || $product->status !== 'approved') {
            return;
        }

        DB::transaction(function () use ($product): void {
            if ($product->review_requested_at === null) {
                $product->update([
                    'review_requested_at' => now(),
                    'review_requested_by' => $product->user_id,
                ]);
            }

            app(\App\Storefront\ProductReviewHistory::class)->record(
                $product->fresh(),
                'updated',
                'approved',
                'approved',
                \App\Models\User::query()->find($product->user_id),
                'creator',
                null,
                ['changed' => ['course_content']],
            );
        });
    }
```

- [ ] **Step 4: Update the CoursesController inline path**

In `app/Courses/Controllers/CoursesController.php`, replace lines 105-110 (the `$course->product->update($productData);` block through the demotion) with:

```php
                $course->product->update($productData);
                // Keep a live course sellable while its edit awaits review.
                if ($course->product->status === 'approved' && $policy->updatingRequiresReview()) {
                    if ($course->product->review_requested_at === null) {
                        $course->product->update([
                            'review_requested_at' => now(),
                            'review_requested_by' => $request->user()->id,
                        ]);
                    }
                    app(\App\Storefront\ProductReviewHistory::class)->record(
                        $course->product->fresh(),
                        'updated',
                        'approved',
                        'approved',
                        $request->user(),
                        'creator',
                        null,
                        ['changed' => array_keys($productData)],
                    );
                }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `ddev exec ./vendor/bin/pest tests/Feature/ProductApprovalPipelineTest.php --filter=testCourseContentChange`
Expected: 2 passed.

- [ ] **Step 6: Commit**

```bash
git add app/Courses/Services/CourseService.php \
        app/Courses/Controllers/CoursesController.php \
        tests/Feature/ProductApprovalPipelineTest.php
git commit -m "feat(courses): queue review for content changes without unpublishing"
```

---

## Task 6: Admin updated queue, counters, and update approve/reject

**Files:**
- Modify: `app/Storefront/Controllers/AdminDigitalProductsController.php`
- Create: `tests/Feature/AdminProductReviewQueueTest.php`

**Interfaces:**
- Consumes: `ProductReviewHistory::record(...)`, `DigitalProduct::hasPendingUpdate()`.
- Produces: `GET admin/digital-products?scope=updated`, `meta.counters.updated.total`, broadened `approve`/`reject`.

- [ ] **Step 1: Write the failing test**

`tests/Feature/AdminProductReviewQueueTest.php`

```php
<?php

namespace Tests\Feature;

use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use Common\Permissions\Models\Permission;
use Common\Settings\Models\Setting;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\Models\Workspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class AdminProductReviewQueueTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        Setting::query()->where('name', 'like', 'product.%')->delete();
        settings()->loadSettings();
        ActiveWorkspace::clearCache();
        parent::tearDown();
    }

    public function testUpdatedScopeReturnsOnlyUnreviewedUpdates(): void
    {
        $admin = $this->createAdmin();
        [$creator, $workspace] = $this->creatorContext();

        $flagged = $this->product($workspace, $creator, [
            'status' => 'approved',
            'approved_at' => now(),
            'review_requested_at' => now(),
            'review_requested_by' => $creator->id,
        ]);
        $clean = $this->product($workspace, $creator, ['status' => 'approved', 'approved_at' => now()]);
        $pending = $this->product($workspace, $creator, ['status' => 'pending_approval']);

        $response = $this->stateful()->actingAs($admin)->getJson('/api/v1/admin/digital-products?scope=updated');

        $response->assertOk();
        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertContains($flagged->id, $ids);
        $this->assertNotContains($clean->id, $ids);
        $this->assertNotContains($pending->id, $ids);
        $response->assertJsonPath('meta.counters.updated.total', 1);
    }

    public function testAdminCanApproveAPendingUpdate(): void
    {
        $admin = $this->createAdmin();
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator, [
            'status' => 'approved',
            'approved_at' => now()->subDay(),
            'review_requested_at' => now(),
            'review_requested_by' => $creator->id,
        ]);

        $this->stateful()->actingAs($admin)
            ->postJson("/api/v1/admin/digital-products/{$product->id}/approve")
            ->assertOk();

        $fresh = $product->fresh();
        $this->assertSame('approved', $fresh->status);
        $this->assertNull($fresh->review_requested_at);
        $this->assertNull($fresh->review_requested_by);
        $this->assertDatabaseHas('digital_product_review_events', [
            'digital_product_id' => $product->id,
            'event' => 'update_approved',
            'actor_role' => 'admin',
        ]);
    }

    public function testAdminCanRejectAPendingUpdateTakesItOffline(): void
    {
        $admin = $this->createAdmin();
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator, [
            'status' => 'approved',
            'approved_at' => now()->subDay(),
            'review_requested_at' => now(),
            'review_requested_by' => $creator->id,
        ]);

        $this->stateful()->actingAs($admin)
            ->postJson("/api/v1/admin/digital-products/{$product->id}/reject", ['reason' => 'Not suitable'])
            ->assertOk();

        $fresh = $product->fresh();
        $this->assertSame('rejected', $fresh->status);
        $this->assertNull($fresh->review_requested_at);
        $this->assertSame('Not suitable', $fresh->rejection_reason);
        $this->assertDatabaseHas('digital_product_review_events', [
            'digital_product_id' => $product->id,
            'event' => 'update_rejected',
            'actor_role' => 'admin',
            'reason' => 'Not suitable',
        ]);
    }

    private function product(Workspace $workspace, User $creator, array $attributes = []): DigitalProduct
    {
        return DigitalProduct::query()->create(array_merge([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Product ' . Str::random(6),
            'price_cents' => 1000,
            'currency' => 'ETB',
            'type' => 'digital',
        ], $attributes));
    }

    private function creatorContext(): array
    {
        $creator = User::query()->forceCreate([
            'name' => 'Creator ' . Str::random(6),
            'username' => Str::lower(Str::random(10)),
            'email' => Str::random(8) . '@example.test',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);
        if (!Workspace::query()->where('owner_id', $creator->id)->where('is_personal', true)->exists()) {
            (new CreateWorkspace())->createPersonalWorkspace($creator);
        }
        ActiveWorkspace::clearCache();

        return [$creator, $creator->workspaces()->first()];
    }

    private function createAdmin(): User
    {
        $user = User::query()->forceCreate([
            'name' => 'Admin ' . Str::random(6),
            'username' => Str::lower(Str::random(10)),
            'email' => Str::random(8) . '@example.test',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);
        $user->permissions()->attach(
            Permission::query()->firstOrCreate(['name' => 'admin']),
        );

        return $user;
    }

    private function stateful(): static
    {
        $csrfToken = 'test-csrf-token';

        return $this->withSession(['_token' => $csrfToken])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', $csrfToken);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `ddev exec ./vendor/bin/pest tests/Feature/AdminProductReviewQueueTest.php`
Expected: FAIL — `scope=updated` is ignored / counters missing.

- [ ] **Step 3: Update the admin controller**

In `app/Storefront/Controllers/AdminDigitalProductsController.php`, add imports:

```php
use App\Storefront\ProductReviewHistory;
use Illuminate\Support\Facades\DB;
```

In `index()`, after `$sort = $request->string('sort');` add:

```php
        $scope = $request->string('scope')->toString();
```

After the `$query->when($status->isNotEmpty(), ...)` line add:

```php
        $query->when($scope === 'updated', fn ($q) => $q
            ->where('status', 'approved')
            ->whereNotNull('review_requested_at'));
```

In the `$counters` array add:

```php
            'updated' => ['total' => DigitalProduct::where('status', 'approved')->whereNotNull('review_requested_at')->count()],
```

Replace the `approve()` and `reject()` methods with:

```php
    public function approve(Request $request, DigitalProduct $digitalProduct)
    {
        Gate::authorize('admin.access');

        $isUpdate = $digitalProduct->status === 'approved' && $digitalProduct->review_requested_at !== null;
        abort_unless($digitalProduct->status === 'pending_approval' || $isUpdate, 422);
        $from = $digitalProduct->status;

        DB::transaction(function () use ($digitalProduct, $isUpdate, $from, $request): void {
            $digitalProduct->update([
                'status' => 'approved',
                'approved_at' => now(),
                'rejection_reason' => null,
                'review_requested_at' => null,
                'review_requested_by' => null,
            ]);

            app(ProductReviewHistory::class)->record(
                $digitalProduct,
                $isUpdate ? 'update_approved' : 'approved',
                $from,
                'approved',
                $request->user(),
                'admin',
            );
        });

        return $digitalProduct->fresh()->load(['creator', 'cover', 'files', 'biolinks']);
    }

    public function reject(Request $request, DigitalProduct $digitalProduct)
    {
        Gate::authorize('admin.access');

        $isUpdate = $digitalProduct->status === 'approved' && $digitalProduct->review_requested_at !== null;
        abort_unless($digitalProduct->status === 'pending_approval' || $isUpdate, 422);
        $data = $request->validate(['reason' => 'nullable|string|max:2000']);
        $from = $digitalProduct->status;

        DB::transaction(function () use ($digitalProduct, $data, $isUpdate, $from, $request): void {
            $digitalProduct->update([
                'status' => 'rejected',
                'rejection_reason' => $data['reason'] ?? null,
                'review_requested_at' => null,
                'review_requested_by' => null,
            ]);

            app(ProductReviewHistory::class)->record(
                $digitalProduct,
                $isUpdate ? 'update_rejected' : 'rejected',
                $from,
                'rejected',
                $request->user(),
                'admin',
                $data['reason'] ?? null,
            );
        });

        return $digitalProduct->fresh()->load(['creator', 'cover', 'files', 'biolinks']);
    }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `ddev exec ./vendor/bin/pest tests/Feature/AdminProductReviewQueueTest.php`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add app/Storefront/Controllers/AdminDigitalProductsController.php \
        tests/Feature/AdminProductReviewQueueTest.php
git commit -m "feat(admin): updated review queue and update-aware approve/reject"
```

---

## Task 7: Expose pending-update state on the resource

**Files:**
- Modify: `app/Storefront/Resources/DigitalProductResource.php`
- Modify: `tests/Feature/ProductApprovalPipelineTest.php`

**Interfaces:**
- Consumes: `DigitalProduct::hasPendingUpdate()`.
- Produces: `DigitalProductResource` fields `review_requested_at` and `has_pending_update`.

- [ ] **Step 1: Write the failing test**

Insert into `ProductApprovalPipelineTest` before `private function creatorContext()`:

```php
    public function testCreatorIndexExposesPendingUpdateFlag(): void
    {
        settings()->save(['product.updating_requires_review' => 1]);
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator, [
            'status' => 'approved',
            'approved_at' => now(),
            'review_requested_at' => now(),
        ]);

        $response = $this->stateful()->actingAs($creator)->getJson('/api/v1/digital-products');

        $response->assertOk();
        $row = collect($response->json('data'))->firstWhere('id', $product->id);
        $this->assertNotNull($row);
        $this->assertTrue($row['has_pending_update']);
        $this->assertNotNull($row['review_requested_at']);
    }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `ddev exec ./vendor/bin/pest tests/Feature/ProductApprovalPipelineTest.php --filter=testCreatorIndexExposesPendingUpdateFlag`
Expected: FAIL — `has_pending_update` key missing.

- [ ] **Step 3: Add the resource fields**

In `app/Storefront/Resources/DigitalProductResource.php`, after the `'approved_at' => $this->approved_at,` line add:

```php
            'review_requested_at' => $this->review_requested_at,
            'has_pending_update' => $this->resource->hasPendingUpdate(),
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `ddev exec ./vendor/bin/pest tests/Feature/ProductApprovalPipelineTest.php`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add app/Storefront/Resources/DigitalProductResource.php tests/Feature/ProductApprovalPipelineTest.php
git commit -m "feat(products): expose pending update state on resource"
```

---

## Task 8: Creator "Update under review" badge

**Files:**
- Modify: `resources/client/dashboard/digital-products/digital-products-page.tsx`
- Create: `resources/client/dashboard/digital-products/digital-products-page.test.ts`

**Interfaces:**
- Consumes: `has_pending_update` from the API.
- Produces: an amber "Update under review" badge for approved products with a pending update.

- [ ] **Step 1: Write the failing test**

`resources/client/dashboard/digital-products/digital-products-page.test.ts`

```ts
import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const source = fs.readFileSync(
  path.resolve(
    'resources/client/dashboard/digital-products/digital-products-page.tsx',
  ),
  'utf8',
);

describe('creator product pending-update badge', () => {
  test('reads the pending update flag from the API', () => {
    expect(source).toContain('has_pending_update');
  });

  test('renders an Update under review badge for approved products', () => {
    expect(source).toContain('<Trans message="Update under review" />');
    expect(source).toContain('hasPendingUpdate');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- resources/client/dashboard/digital-products/digital-products-page.test.ts`
Expected: FAIL — source does not contain `has_pending_update`.

- [ ] **Step 3: Add the field and badge**

In `resources/client/dashboard/digital-products/digital-products-page.tsx`:

Add to the `Product` type (after `rejection_reason?: string | null;`):

```ts
  review_requested_at?: string | null;
  has_pending_update?: boolean;
```

Change the `StatusBadge` call site (line ~270) from `<StatusBadge status={product.status} />` to:

```tsx
          <StatusBadge
            status={product.status}
            hasPendingUpdate={product.has_pending_update}
          />
```

Replace the `StatusBadge` function with:

```tsx
function StatusBadge({
  status,
  hasPendingUpdate = false,
}: {
  status: ProductStatus;
  hasPendingUpdate?: boolean;
}) {
  const className = 'border border-border/70 bg-background/95 shadow-sm';

  if (status === 'approved' && hasPendingUpdate) {
    return (
      <Badge variant="outline" className={className}>
        <Clock3Icon />
        <Trans message="Update under review" />
      </Badge>
    );
  }

  switch (status) {
    case 'pending_approval':
      return (
        <Badge variant="secondary" className={className}>
          <Clock3Icon />
          <Trans message="In review" />
        </Badge>
      );
    case 'approved':
      return (
        <Badge variant="positive" className={className}>
          <CheckCircle2Icon />
          <Trans message="Live" />
        </Badge>
      );
    case 'rejected':
      return (
        <Badge variant="destructive" className={className}>
          <TriangleAlertIcon />
          <Trans message="Needs changes" />
        </Badge>
      );
    case 'archived':
      return (
        <Badge variant="secondary" className={className}>
          <ArchiveIcon />
          <Trans message="Archived" />
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className={className}>
          <CircleDashedIcon />
          <Trans message="Draft" />
        </Badge>
      );
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- resources/client/dashboard/digital-products/digital-products-page.test.ts`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add resources/client/dashboard/digital-products/digital-products-page.tsx \
        resources/client/dashboard/digital-products/digital-products-page.test.ts
git commit -m "feat(dashboard): show update-under-review badge on live products"
```

---

## Task 9: Admin "Updates pending" filter and update actions

**Files:**
- Modify: `resources/client/admin/digital-products/admin-digital-products-queries.ts`
- Modify: `resources/client/admin/digital-products/admin-digital-products-page.tsx`
- Modify: `resources/client/admin/digital-products/admin-digital-products-datatable-columns.tsx`
- Create: `resources/client/admin/digital-products/admin-product-review-queue.test.ts`

**Interfaces:**
- Consumes: `scope=updated`, `meta.counters.updated.total`, `has_pending_update`.
- Produces: clickable "Updates pending" metric card; approve/reject available on updated rows.

- [ ] **Step 1: Write the failing test**

`resources/client/admin/digital-products/admin-product-review-queue.test.ts`

```ts
import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const queries = fs.readFileSync(
  path.resolve(
    'resources/client/admin/digital-products/admin-digital-products-queries.ts',
  ),
  'utf8',
);
const page = fs.readFileSync(
  path.resolve(
    'resources/client/admin/digital-products/admin-digital-products-page.tsx',
  ),
  'utf8',
);
const columns = fs.readFileSync(
  path.resolve(
    'resources/client/admin/digital-products/admin-digital-products-datatable-columns.tsx',
  ),
  'utf8',
);

describe('admin product review queue', () => {
  test('passes the updated scope to the API', () => {
    expect(queries).toContain('scope: params.scope');
  });

  test('renders an Updates pending metric from counters', () => {
    expect(page).toContain('counters?.updated');
    expect(page).toContain('Updates pending');
    expect(page).toContain('parseAsString');
  });

  test('allows approve/reject on updated rows', () => {
    expect(columns).toContain('has_pending_update');
    expect(columns).toContain('isActionable');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- resources/client/admin/digital-products/admin-product-review-queue.test.ts`
Expected: FAIL.

- [ ] **Step 3: Map the scope in queries**

In `resources/client/admin/digital-products/admin-digital-products-queries.ts`, add to the `mapped` object after `sort: params.sort ?? '',`:

```ts
    scope: params.scope ?? '',
```

- [ ] **Step 4: Add the metric card and parser**

In `resources/client/admin/digital-products/admin-digital-products-page.tsx`:

Add imports:

```tsx
import {RefreshCwIcon} from 'lucide-react';
import {parseAsString} from 'nuqs';
```

Change the `useTableQueryState` call to add the parser:

```tsx
  const {queryState, setQueryState, deferredSearchParams, isFiltering, isLoading} =
    useTableQueryState({
      filters: AdminDigitalProductsDatatableFilters,
      parsers: {scope: parseAsString.withDefault('')},
    });
```

After `const rejected = counters?.rejected?.total ?? 0;` add:

```tsx
  const updated = counters?.updated?.total ?? 0;
  const scope = (queryState.scope as string) ?? '';
```

Change the metric grid class from `xl:grid-cols-4` to `xl:grid-cols-5` and add the card after the Rejected card:

```tsx
            <MetricCard
              label="Updates pending"
              value={String(updated)}
              icon={<RefreshCwIcon />}
              tone={updated > 0 ? 'warning' : 'default'}
              onClick={() =>
                setQueryState(
                  {scope: scope === 'updated' ? null : 'updated'},
                  {resetPage: true},
                )
              }
            />
```

Change the `MetricCard` signature and return:

```tsx
function MetricCard({
  label,
  value,
  icon,
  tone = 'default',
  onClick,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone?: 'default' | 'positive' | 'warning';
  onClick?: () => void;
}) {
  const iconClass =
    tone === 'positive'
      ? 'text-positive bg-positive/10'
      : tone === 'warning'
        ? 'text-amber-600 bg-amber-500/10 dark:text-amber-400'
        : 'text-muted-foreground bg-muted';

  const card = (
    <Card size="sm" className="gap-3">
      <Card.Header>
        <Card.Title className="truncate text-sm font-normal text-muted-foreground">
          <Trans message={label} />
        </Card.Title>
        <Card.Action>
          <span
            className={`flex size-9 items-center justify-center rounded-card-sm [&>svg]:size-4 ${iconClass}`}
          >
            {icon}
          </span>
        </Card.Action>
      </Card.Header>
      <Card.Content>
        <p className="truncate text-2xl font-semibold tracking-tight tabular-nums">
          {value}
        </p>
      </Card.Content>
    </Card>
  );

  if (!onClick) {
    return card;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-card text-left transition-opacity hover:opacity-90"
    >
      {card}
    </button>
  );
}
```

- [ ] **Step 5: Add update handling to the columns**

In `resources/client/admin/digital-products/admin-digital-products-datatable-columns.tsx`:

Add to `AdminDigitalProduct` type after `rejection_reason?: string | null;`:

```ts
  review_requested_at?: string | null;
  has_pending_update?: boolean;
```

Change the status cell (line ~177) to:

```tsx
        <ProductStatusBadge
          status={row.original.status}
          hasPendingUpdate={row.original.has_pending_update}
        />
```

In `ProductActionsButton`, after `const [reason, setReason] = useState('');` add:

```tsx
  const isUpdate = product.status === 'approved' && !!product.has_pending_update;
  const isActionable = product.status === 'pending_approval' || isUpdate;
```

Replace the two `product.status === 'pending_approval' &&` conditions (the rejection-reason field and the footer buttons) with `isActionable &&`.

In the dialog body, after the creator/files/price block, add:

```tsx
              {isUpdate && (
                <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
                  <Trans message="This update is live on the storefront until it is reviewed." />
                </p>
              )}
```

Change `ProductStatusBadge` to accept the extra prop and render the update badge:

```tsx
export function ProductStatusBadge({
  status,
  hasPendingUpdate = false,
}: {
  status: AdminDigitalProduct['status'];
  hasPendingUpdate?: boolean;
}) {
  if (status === 'approved' && hasPendingUpdate) {
    return (
      <div className="flex items-center gap-1.5">
        <Badge variant="positive" className="font-medium">
          <BadgeCheckIcon className="size-3.5" aria-hidden="true" />
          <Trans message="Approved" />
        </Badge>
        <Badge
          variant="outline"
          className="border-amber-200 bg-amber-50 font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300"
        >
          <ClockIcon className="size-3.5" aria-hidden="true" />
          <Trans message="Update" />
        </Badge>
      </div>
    );
  }
  if (status === 'approved') {
    return (
      <Badge variant="positive" className="font-medium">
        <BadgeCheckIcon className="size-3.5" aria-hidden="true" />
        <Trans message="Approved" />
      </Badge>
    );
  }
  if (status === 'rejected') {
    return (
      <Badge variant="destructive" className="font-medium">
        <XCircleIcon className="size-3.5" aria-hidden="true" />
        <Trans message="Rejected" />
      </Badge>
    );
  }
  if (status === 'draft') {
    return (
      <Badge variant="secondary" className="font-medium">
        <FileIcon className="size-3.5" aria-hidden="true" />
        <Trans message="Draft" />
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-amber-200 bg-amber-50 font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
      <ClockIcon className="size-3.5" aria-hidden="true" />
      <Trans message="Pending" />
    </Badge>
  );
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm run test -- resources/client/admin/digital-products/admin-product-review-queue.test.ts`
Expected: 3 passed.

- [ ] **Step 7: Commit**

```bash
git add resources/client/admin/digital-products/admin-digital-products-queries.ts \
        resources/client/admin/digital-products/admin-digital-products-page.tsx \
        resources/client/admin/digital-products/admin-digital-products-datatable-columns.tsx \
        resources/client/admin/digital-products/admin-product-review-queue.test.ts
git commit -m "feat(admin): updated pending filter, counter, and update actions"
```

---

## Task 10: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Type-check**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: exit 0, no output.

- [ ] **Step 2: Frontend tests**

Run: `npm run test`
Expected: all test files pass.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: `✓ built in ...`.

- [ ] **Step 4: Restore the tracked build artifact**

Run: `git restore public/build/manifest.json`

- [ ] **Step 5: Backend tests**

Run: `ddev exec ./vendor/bin/pest`
Expected: 0 failures (skips allowed).

- [ ] **Step 6: Report**

Report the raw output of all four commands, note that no browser is available for visual verification, and wait for explicit approval before creating a PR.

---

## Self-Review Notes

- **Spec coverage:** schema/flag/event table (Task 1), audit writer (Task 2), submit policy fix (Task 3), demotion removal + queue (Task 4), course paths (Task 5), admin `scope=updated` + counters + approve/reject (Task 6), resource fields (Task 7), creator badge (Task 8), admin UI (Task 9), verification (Task 10). Out-of-scope items (detail page, nested nav, notifications, bulk, versioning) have no tasks by design.
- **Type consistency:** `ProductReviewHistory::record()` signature is identical in Tasks 2, 3, 4, 5, and 6. `has_pending_update` is produced in Task 7 and consumed in Tasks 8 and 9. `scope` is produced by the backend in Task 6 and consumed in Task 9.
- **Known deliberate behavior:** `approved_at` is never cleared; `submit()` reads it before any write so a rejected-after-update product keeps using the update policy.
