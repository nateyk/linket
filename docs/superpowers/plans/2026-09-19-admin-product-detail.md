# Admin Product Detail + History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deep-linkable read-only admin product detail page with Details and History tabs, backed by one `show` endpoint that returns the product resource plus its capped review-event audit trail.

**Architecture:** A new `GET /api/v1/admin/digital-products/{id}` (`whereNumber` to avoid shadowing sibling static routes) returns `AdminDigitalProductResource`. The React page reads it via TanStack Query, renders Details (cover, description, outcomes, files, course summary, metadata sidebar) and History (event timeline), and reuses the existing approve/reject endpoints. The products-list title links to the page; the quick Review dialog is unchanged.

**Tech Stack:** Laravel 11 (PHP 8.2), Eloquent, Pest/PHPUnit feature tests; React 19 + TypeScript, react-router, TanStack Query, Base UI (`@shadcn/tabs`), Vitest, Vite.

**Spec:** `docs/superpowers/specs/2026-09-19-admin-product-detail-design.md`

## Global Constraints

- Work on branch `feat/admin-product-detail` (already checked out off `origin/main`).
- ddev project: run PHP/artisan/pest via `ddev exec` (e.g. `ddev exec ./vendor/bin/pest ...`).
- `Model::preventLazyLoading()` is active outside production (including the testing env) — eager-load only; never lazy-load in a loop.
- The `{digitalProduct}` route MUST use `->whereNumber('digitalProduct')` so it cannot shadow `admin/digital-products/order-recovery-deliveries` and `.../withdrawal-methods`.
- History is capped at the newest 50 events, newest first.
- Strings in TSX via `<Trans message="..." />`; currency via `formatMoney`; byte sizes via `prettyBytes` from `@ui/utils/files/pretty-bytes`; dates via `FormattedDate` from `@ui/i18n/formatted-date`; lucide icons use `size-*`.
- Do not touch or stage `NUL`, `public/build/manifest.json`, or unrelated work.
- Verify before any PR: `npx tsc --noEmit --skipLibCheck`, `npm run test`, `npm run build`, `ddev exec ./vendor/bin/pest`, then `git restore public/build/manifest.json`.
- Do not commit, push, or open a PR unless the user explicitly asks.

---

## File Structure

**Create**
- `app/Storefront/Resources/AdminDigitalProductResource.php`
- `tests/Feature/AdminDigitalProductDetailTest.php`
- `resources/client/admin/digital-products/admin-digital-product-display.tsx` (shared type + status badge + `looksLikeHtml`)
- `resources/client/admin/digital-products/admin-digital-product-detail-queries.ts`
- `resources/client/admin/digital-products/admin-digital-product-detail-page.tsx`
- `resources/client/admin/digital-products/admin-product-detail.test.ts`

**Modify**
- `app/Storefront/Models/DigitalProductReviewEvent.php` (add `actor()`)
- `app/Storefront/Controllers/AdminDigitalProductsController.php` (add `show()`)
- `common/foundation/routes/api.php` (add show route)
- `resources/client/admin/digital-products/admin-digital-products-datatable-columns.tsx` (import shared display, link title)
- `resources/client/admin/admin-routes.tsx` (add detail route)

---

## Task 1: Admin show endpoint

**Files:**
- Create: `app/Storefront/Resources/AdminDigitalProductResource.php`
- Create: `tests/Feature/AdminDigitalProductDetailTest.php`
- Modify: `app/Storefront/Models/DigitalProductReviewEvent.php`
- Modify: `app/Storefront/Controllers/AdminDigitalProductsController.php`
- Modify: `common/foundation/routes/api.php`

**Interfaces:**
- Consumes: `DigitalProduct` relations `creator`, `cover`, `files`, `biolinks`, `course`, `reviewEvents`, `orders`; `DigitalProductReviewEvent`.
- Produces: `GET /api/v1/admin/digital-products/{digitalProduct}` → `AdminDigitalProductResource` (`{data: {...}}`); `DigitalProductReviewEvent::actor(): BelongsTo`.

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/AdminDigitalProductDetailTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Biolinks\Models\Biolink;
use App\Courses\Models\Chapter;
use App\Courses\Models\Course;
use App\Courses\Models\Lesson;
use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\DigitalProductReviewEvent;
use Common\Files\FileEntry;
use Common\Permissions\Models\Permission;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\Models\Workspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class AdminDigitalProductDetailTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        ActiveWorkspace::clearCache();
        parent::tearDown();
    }

    public function testAdminCanViewProductDetailWithHistory(): void
    {
        $admin = $this->createAdmin();
        [$creator, $workspace] = $this->creatorContext();
        $file = $this->createFile($creator, $workspace);
        $store = $this->createStore($creator, $workspace);
        $product = $this->product($workspace, $creator, [
            'status' => 'approved',
            'approved_at' => now(),
            'review_requested_at' => now(),
            'review_requested_by' => $creator->id,
        ]);
        $product->files()->attach($file->id);
        $product->biolinks()->attach($store->id);

        DigitalProductReviewEvent::query()->create([
            'digital_product_id' => $product->id,
            'actor_id' => $admin->id,
            'actor_role' => 'admin',
            'event' => 'created',
            'to_status' => 'draft',
        ]);
        DigitalProductReviewEvent::query()->create([
            'digital_product_id' => $product->id,
            'actor_id' => $creator->id,
            'actor_role' => 'creator',
            'event' => 'update_approved',
            'from_status' => 'approved',
            'to_status' => 'approved',
        ]);

        $response = $this->stateful()->actingAs($admin)
            ->getJson("/api/v1/admin/digital-products/{$product->id}");

        $response->assertOk();
        $response->assertJsonPath('data.id', $product->id);
        $response->assertJsonPath('data.creator.id', $creator->id);
        $response->assertJsonPath('data.has_pending_update', true);
        $response->assertJsonCount(1, 'data.files');
        $response->assertJsonCount(1, 'data.stores');
        $response->assertJsonPath('data.course', null);

        // Newest first.
        $this->assertSame('update_approved', $response->json('data.history.0.event'));
        $this->assertSame($creator->id, $response->json('data.history.0.actor.id'));
        $this->assertSame('created', $response->json('data.history.1.event'));
        $this->assertSame($admin->id, $response->json('data.history.1.actor.id'));
    }

    public function testNonAdminCannotViewProductDetail(): void
    {
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator);

        $this->stateful()->actingAs($creator)
            ->getJson("/api/v1/admin/digital-products/{$product->id}")
            ->assertForbidden();
    }

    public function testWildcardRouteDoesNotShadowStaticAdminProductRoutes(): void
    {
        $admin = $this->createAdmin();

        $this->stateful()->actingAs($admin)
            ->getJson('/api/v1/admin/digital-products/order-recovery-deliveries')
            ->assertOk();

        $this->stateful()->actingAs($admin)
            ->getJson('/api/v1/admin/digital-products/withdrawal-methods')
            ->assertOk();
    }

    public function testHistoryIsCappedAtFiftyNewestEvents(): void
    {
        $admin = $this->createAdmin();
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator);

        for ($i = 0; $i < 55; $i++) {
            DigitalProductReviewEvent::query()->create([
                'digital_product_id' => $product->id,
                'actor_role' => 'system',
                'event' => 'updated',
                'from_status' => 'approved',
                'to_status' => 'approved',
            ]);
        }

        $response = $this->stateful()->actingAs($admin)
            ->getJson("/api/v1/admin/digital-products/{$product->id}");

        $response->assertOk();
        $response->assertJsonCount(50, 'data.history');
    }

    public function testCourseProductReturnsCurriculumCounts(): void
    {
        $admin = $this->createAdmin();
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator, [
            'type' => 'course',
            'status' => 'approved',
            'approved_at' => now(),
        ]);
        $course = Course::query()->create([
            'digital_product_id' => $product->id,
            'instructor_user_id' => $creator->id,
            'published_at' => now(),
        ]);
        $chapter = Chapter::query()->create([
            'course_id' => $course->id,
            'title' => 'Chapter 1',
            'sort_order' => 0,
        ]);
        Lesson::query()->create([
            'chapter_id' => $chapter->id,
            'course_id' => $course->id,
            'title' => 'Published',
            'content' => '<p>x</p>',
            'status' => 'published',
            'content_type' => 'readable',
            'sort_order' => 0,
        ]);
        Lesson::query()->create([
            'chapter_id' => $chapter->id,
            'course_id' => $course->id,
            'title' => 'Draft',
            'content' => '<p>x</p>',
            'status' => 'draft',
            'content_type' => 'readable',
            'sort_order' => 1,
        ]);

        $response = $this->stateful()->actingAs($admin)
            ->getJson("/api/v1/admin/digital-products/{$product->id}");

        $response->assertOk();
        $response->assertJsonPath('data.course.chapters_count', 1);
        $response->assertJsonPath('data.course.lessons_count', 2);
        $response->assertJsonPath('data.course.published_lessons_count', 1);
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

    private function createFile(User $creator, Workspace $workspace): FileEntry
    {
        return FileEntry::query()->create([
            'name' => 'download.pdf',
            'file_name' => 'download.pdf',
            'mime' => 'application/pdf',
            'extension' => 'pdf',
            'file_size' => 1024,
            'workspace_id' => $workspace->id,
            'owner_id' => $creator->id,
        ]);
    }

    private function createStore(User $creator, Workspace $workspace): Biolink
    {
        return Biolink::query()->create([
            'back_half' => Str::random(8),
            'name' => 'Store ' . Str::random(4),
            'user_id' => $creator->id,
            'workspace_id' => $workspace->id,
        ]);
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

- [ ] **Step 2: Run the test to verify it fails**

Run: `ddev exec ./vendor/bin/pest tests/Feature/AdminDigitalProductDetailTest.php`
Expected: FAIL — 404 (route/endpoint missing).

- [ ] **Step 3: Add the event actor relation**

In `app/Storefront/Models/DigitalProductReviewEvent.php`, add after `product()`:

```php
    public function actor(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'actor_id');
    }
```

- [ ] **Step 4: Create the resource**

Create `app/Storefront/Resources/AdminDigitalProductResource.php`:

```php
<?php

namespace App\Storefront\Resources;

use App\Storefront\Models\DigitalProduct;
use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin DigitalProduct
 */
#[SchemaName('AdminDigitalProduct')]
class AdminDigitalProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'learning_outcomes' => $this->learning_outcomes,
            'type' => $this->type ?? 'digital',
            'is_course' => ($this->type ?? 'digital') === 'course',
            'status' => $this->status,
            'rejection_reason' => $this->rejection_reason,
            'review_requested_at' => $this->review_requested_at,
            'has_pending_update' => $this->resource->hasPendingUpdate(),
            'approved_at' => $this->approved_at,
            'price_cents' => $this->price_cents,
            'currency' => $this->currency,
            'sales_count' => (int) ($this->sales_count ?? 0),
            'reviews_count' => (int) ($this->reviews_count ?? 0),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'creator' => $this->whenLoaded('creator', fn () => [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
                'email' => $this->creator->email,
                'username' => $this->creator->username,
            ]),
            'cover' => $this->whenLoaded('cover', fn () => $this->cover ? [
                'id' => $this->cover->id,
                'name' => $this->cover->name,
                'url' => $this->cover->url,
            ] : null),
            'files' => $this->whenLoaded('files', fn () => $this->files->map(fn ($file) => [
                'id' => $file->id,
                'name' => $file->name,
                'file_size' => $file->file_size,
                'extension' => $file->extension,
                'url' => $file->url,
            ])),
            'stores' => $this->whenLoaded('biolinks', fn () => $this->biolinks->map(fn ($store) => [
                'id' => $store->id,
                'name' => $store->name,
                'short_url' => $store->short_url,
            ])),
            'course' => $this->whenLoaded('course', fn () => $this->course ? [
                'id' => $this->course->id,
                'published_at' => $this->course->published_at,
                'chapters_count' => (int) ($this->course->chapters_count ?? 0),
                'lessons_count' => (int) ($this->course->lessons_count ?? 0),
                'published_lessons_count' => (int) ($this->course->published_lessons_count ?? 0),
            ] : null),
            'history' => $this->whenLoaded('reviewEvents', fn () => $this->reviewEvents->map(fn ($event) => [
                'id' => $event->id,
                'event' => $event->event,
                'actor_role' => $event->actor_role,
                'actor' => $event->actor ? ['id' => $event->actor->id, 'name' => $event->actor->name] : null,
                'from_status' => $event->from_status,
                'to_status' => $event->to_status,
                'reason' => $event->reason,
                'meta' => $event->meta,
                'created_at' => $event->created_at,
            ])),
        ];
    }
}
```

- [ ] **Step 5: Add the controller show method**

In `app/Storefront/Controllers/AdminDigitalProductsController.php`, add the import:

```php
use App\Storefront\Resources\AdminDigitalProductResource;
```

Add this method (after `index()`):

```php
    public function show(Request $request, DigitalProduct $digitalProduct)
    {
        Gate::authorize('admin.access');

        $digitalProduct->load([
            'creator',
            'cover',
            'files',
            'biolinks',
            'course' => fn ($q) => $q->withCount([
                'chapters',
                'lessons',
                'lessons as published_lessons_count' => fn ($q) => $q->where('status', 'published'),
            ]),
            'reviewEvents' => fn ($q) => $q
                ->with('actor')
                ->orderByDesc('created_at')
                ->orderByDesc('id')
                ->limit(50),
        ])->loadCount([
            'orders as sales_count' => fn ($q) => $q->where('status', 'paid'),
            'reviews',
        ]);

        return new AdminDigitalProductResource($digitalProduct);
    }
```

- [ ] **Step 6: Register the route**

In `common/foundation/routes/api.php`, after the `admin/digital-products` index route, add:

```php
Route::get('admin/digital-products/{digitalProduct}', [AdminDigitalProductsController::class, 'show'])->whereNumber('digitalProduct');
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `ddev exec ./vendor/bin/pest tests/Feature/AdminDigitalProductDetailTest.php`
Expected: 5 passed.

- [ ] **Step 8: Commit**

```bash
git add app/Storefront/Resources/AdminDigitalProductResource.php \
        app/Storefront/Models/DigitalProductReviewEvent.php \
        app/Storefront/Controllers/AdminDigitalProductsController.php \
        common/foundation/routes/api.php \
        tests/Feature/AdminDigitalProductDetailTest.php
git commit -m "feat(admin): add digital product detail show endpoint"
```

---

## Task 2: Shared display primitives and list title link

**Files:**
- Create: `resources/client/admin/digital-products/admin-digital-product-display.tsx`
- Modify: `resources/client/admin/digital-products/admin-digital-products-datatable-columns.tsx`
- Create: `resources/client/admin/digital-products/admin-product-detail.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1 on the frontend.
- Produces: `admin-digital-product-display.tsx` exporting `AdminDigitalProduct` (type), `AdminDigitalProductStatus` (type), `ProductStatusBadge`, `looksLikeHtml`; list title links to `/admin/digital-products/{id}`.

- [ ] **Step 1: Write the failing test**

Create `resources/client/admin/digital-products/admin-product-detail.test.ts`:

```ts
import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const read = (relative: string) =>
  fs.readFileSync(path.resolve(relative), 'utf8');

const columns = read(
  'resources/client/admin/digital-products/admin-digital-products-datatable-columns.tsx',
);
const display = read(
  'resources/client/admin/digital-products/admin-digital-product-display.tsx',
);

describe('admin product shared display', () => {
  test('extracts the status badge and html helper', () => {
    expect(display).toContain('export function ProductStatusBadge');
    expect(display).toContain('export function looksLikeHtml');
    expect(display).toContain('export type AdminDigitalProduct');
  });

  test('columns import the shared display module', () => {
    expect(columns).toContain("from './admin-digital-product-display'");
  });

  test('list title links to the detail page', () => {
    expect(columns).toContain('/admin/digital-products/${product.id}');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- resources/client/admin/digital-products/admin-product-detail.test.ts`
Expected: FAIL — `admin-digital-product-display.tsx` missing.

- [ ] **Step 3: Create the shared display module**

Create `resources/client/admin/digital-products/admin-digital-product-display.tsx`:

```tsx
import {Badge} from '@shadcn/badge/badge';
import {Trans} from '@ui/i18n/trans';
import {BadgeCheckIcon, ClockIcon, FileIcon, XCircleIcon} from 'lucide-react';

export type AdminDigitalProductStatus =
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'draft';

export type AdminDigitalProduct = {
  id: number;
  title: string;
  description?: string | null;
  price_cents: number;
  currency: string;
  status: AdminDigitalProductStatus;
  rejection_reason?: string | null;
  review_requested_at?: string | null;
  has_pending_update?: boolean;
  created_at?: string;
  creator?: {name: string; email: string};
  cover?: {url: string} | null;
  files?: Array<{id: number; name: string}>;
  reviews_count?: number;
  hidden_reviews_count?: number;
  type?: string;
};

export function looksLikeHtml(value: string) {
  return /<[a-z][\s\S]*>/i.test(value);
}

export function ProductStatusBadge({
  status,
  hasPendingUpdate = false,
}: {
  status: AdminDigitalProductStatus;
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
    <Badge
      variant="outline"
      className="border-amber-200 bg-amber-50 font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300"
    >
      <ClockIcon className="size-3.5" aria-hidden="true" />
      <Trans message="Pending" />
    </Badge>
  );
}
```

- [ ] **Step 4: Update the columns file**

In `resources/client/admin/digital-products/admin-digital-products-datatable-columns.tsx`:

1. Remove the local `export type AdminDigitalProduct = { ... };` block (lines 33-50) and replace with an import. Add near the other local imports:

```tsx
import {
  looksLikeHtml,
  ProductStatusBadge,
  type AdminDigitalProduct,
} from './admin-digital-product-display';
```

2. Delete the `export function ProductStatusBadge({ ... }) { ... }` block (lines 438-492) and the `function looksLikeHtml(value: string) { ... }` block (lines 494-496).

3. Remove any now-unused lucide icon imports (`BadgeCheckIcon`, `ClockIcon`, `XCircleIcon` if no longer referenced elsewhere in the file). Keep icons still used (`FileIcon`, `XIcon`, `StarIcon`, etc.). Confirm with `npx tsc --noEmit --skipLibCheck`.

4. Wrap the product title in a link. Change:

```tsx
            <p className="line-clamp-2 text-sm font-medium leading-tight break-words" title={product.title}>
              {product.title}
            </p>
```

to:

```tsx
            <Link
              to={`/admin/digital-products/${product.id}`}
              className="line-clamp-2 text-sm font-medium leading-tight break-words hover:underline hover:underline-offset-3"
              title={product.title}
            >
              {product.title}
            </Link>
```

(`Link` from `react-router` is already imported.)

- [ ] **Step 5: Run the test and type-check**

Run: `npm run test -- resources/client/admin/digital-products/admin-product-detail.test.ts`
Expected: 3 passed.

Run: `npx tsc --noEmit --skipLibCheck`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add resources/client/admin/digital-products/admin-digital-product-display.tsx \
        resources/client/admin/digital-products/admin-digital-products-datatable-columns.tsx \
        resources/client/admin/digital-products/admin-product-detail.test.ts
git commit -m "refactor(admin): share product display primitives and link list titles"
```

---

## Task 3: Detail page with Details and History tabs

**Files:**
- Create: `resources/client/admin/digital-products/admin-digital-product-detail-queries.ts`
- Create: `resources/client/admin/digital-products/admin-digital-product-detail-page.tsx`
- Modify: `resources/client/admin/admin-routes.tsx`
- Modify: `resources/client/admin/digital-products/admin-product-detail.test.ts`

**Interfaces:**
- Consumes: `AdminDigitalProductResource` (Task 1), `ProductStatusBadge` / `looksLikeHtml` / `AdminDigitalProduct` (Task 2), `adminDigitalProductsBaseKey`.
- Produces: route `/admin/digital-products/:productId`; query `adminDigitalProductDetailOptions(productId)`; query key base `adminDigitalProductDetailBaseKey`.

- [ ] **Step 1: Extend the failing test**

Append to `resources/client/admin/digital-products/admin-product-detail.test.ts`:

```ts
const routes = read('resources/client/admin/admin-routes.tsx');
const queries = read(
  'resources/client/admin/digital-products/admin-digital-product-detail-queries.ts',
);
const page = read(
  'resources/client/admin/digital-products/admin-digital-product-detail-page.tsx',
);

describe('admin product detail page', () => {
  test('registers the detail route', () => {
    expect(routes).toContain("'digital-products/:productId'");
    expect(routes).toContain('admin-digital-product-detail-page');
  });

  test('queries the admin show endpoint', () => {
    expect(queries).toContain('/api/v1/admin/digital-products/${productId}');
  });

  test('renders Details and History panels', () => {
    expect(page).toContain('function DetailsPanel');
    expect(page).toContain('function HistoryPanel');
    expect(page).toContain('<Trans message="Details" />');
    expect(page).toContain('<Trans message="History" />');
  });

  test('consumes the history event fields', () => {
    expect(page).toContain('actor_role');
    expect(page).toContain('from_status');
    expect(page).toContain('to_status');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- resources/client/admin/digital-products/admin-product-detail.test.ts`
Expected: FAIL — detail queries/page/routes missing.

- [ ] **Step 3: Create the query module**

Create `resources/client/admin/digital-products/admin-digital-product-detail-queries.ts`:

```ts
import {apiClient} from '@common/http/query-client';
import {queryOptions} from '@tanstack/react-query';

export const adminDigitalProductDetailBaseKey = ['adminDigitalProductDetail'];

export const adminDigitalProductDetailOptions = (productId: string) =>
  queryOptions({
    queryKey: [...adminDigitalProductDetailBaseKey, productId],
    queryFn: () =>
      apiClient
        .get(`/api/v1/admin/digital-products/${productId}`)
        .then(response => response.data),
  });
```

- [ ] **Step 4: Create the detail page**

Create `resources/client/admin/digital-products/admin-digital-product-detail-page.tsx`:

```tsx
import {useShowGlobalLoadingBar} from '@common/core/use-show-global-loading-bar';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {apiClient} from '@common/http/query-client';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {Tabs} from '@shadcn/tabs/tabs';
import {toast} from '@shadcn/toast/toast';
import {useMutation, useQueryClient, useSuspenseQuery} from '@tanstack/react-query';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {formatMoney} from '@ui/i18n/format-money';
import {Trans} from '@ui/i18n/trans';
import {prettyBytes} from '@ui/utils/files/pretty-bytes';
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  CheckIcon,
  FileIcon,
  XIcon,
} from 'lucide-react';
import {useState, type ReactNode} from 'react';
import {Link, useParams} from 'react-router';
import {
  type AdminDigitalProductStatus,
  looksLikeHtml,
  ProductStatusBadge,
} from './admin-digital-product-display';
import {adminDigitalProductDetailOptions} from './admin-digital-product-detail-queries';
import {adminDigitalProductsBaseKey} from './admin-digital-products-queries';

type HistoryEvent = {
  id: number;
  event: string;
  actor_role: string;
  actor: {id: number; name: string} | null;
  from_status: string | null;
  to_status: string | null;
  reason: string | null;
  meta: {changed?: string[]; review_requested?: boolean} | null;
  created_at: string | null;
};

type AdminProductDetail = {
  id: number;
  title: string;
  description?: string | null;
  learning_outcomes?: string[] | null;
  type?: string;
  is_course?: boolean;
  status: AdminDigitalProductStatus;
  rejection_reason?: string | null;
  review_requested_at?: string | null;
  has_pending_update?: boolean;
  approved_at?: string | null;
  price_cents: number;
  currency: string;
  sales_count: number;
  reviews_count: number;
  created_at?: string | null;
  updated_at?: string | null;
  creator?: {id: number; name: string; email: string; username?: string};
  cover?: {id: number; name: string; url: string} | null;
  files?: Array<{
    id: number;
    name: string;
    file_size: number;
    extension: string;
    url: string;
  }>;
  stores?: Array<{id: number; name: string; short_url: string}>;
  course?: {
    id: number;
    published_at?: string | null;
    chapters_count: number;
    lessons_count: number;
    published_lessons_count: number;
  } | null;
  history?: HistoryEvent[];
};

export function Component() {
  const {productId} = useParams();
  const query = useSuspenseQuery(adminDigitalProductDetailOptions(productId ?? ''));
  const queryClient = useQueryClient();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');

  const product = query.data?.data as AdminProductDetail | undefined;

  useShowGlobalLoadingBar({isLoading: query.isFetching});

  const invalidate = () => {
    queryClient.invalidateQueries({queryKey: adminDigitalProductsBaseKey});
    queryClient.invalidateQueries({queryKey: ['adminDigitalProductDetail']});
  };

  const approve = useMutation({
    mutationFn: () =>
      apiClient.post(`/api/v1/admin/digital-products/${product?.id}/approve`),
    onSuccess: () => {
      invalidate();
      toast.success(<Trans message="Product approved." />);
    },
    onError: error => showHttpErrorToast(error),
  });

  const reject = useMutation({
    mutationFn: () =>
      apiClient.post(`/api/v1/admin/digital-products/${product?.id}/reject`, {
        reason: reason.trim() || null,
      }),
    onSuccess: () => {
      setRejectOpen(false);
      setReason('');
      invalidate();
      toast.success(<Trans message="Product rejected." />);
    },
    onError: error => showHttpErrorToast(error),
  });

  if (!product) {
    return null;
  }

  const isActionable =
    product.status === 'pending_approval' || !!product.has_pending_update;
  const primaryStore = product.stores?.[0];
  const publicUrl = primaryStore
    ? `${primaryStore.short_url.replace(/\/$/, '')}/products/${product.id}`
    : null;

  return (
    <DashboardLayout.MainSection>
      <StaticPageTitle>{product.title}</StaticPageTitle>

      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <span className="flex items-center gap-2">
            {product.title}
            <ProductStatusBadge
              status={product.status}
              hasPendingUpdate={product.has_pending_update}
            />
          </span>
        </DashboardLayout.SectionTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link to="/admin/digital-products" />}
          >
            <ArrowLeftIcon />
            <Trans message="Back to products" />
          </Button>
          {publicUrl && (
            <Button
              variant="outline"
              nativeButton={false}
              render={<a href={publicUrl} target="_blank" rel="noreferrer" />}
            >
              <ArrowUpRightIcon />
              <Trans message="View live" />
            </Button>
          )}
          {isActionable && (
            <>
              <Button
                variant="outline"
                color="danger"
                disabled={reject.isPending}
                onClick={() => setRejectOpen(true)}
              >
                <XIcon />
                <Trans message="Reject" />
              </Button>
              <Button disabled={approve.isPending} onClick={() => approve.mutate()}>
                <CheckIcon />
                <Trans message="Approve" />
              </Button>
            </>
          )}
        </div>
      </DashboardLayout.SectionHeader>

      <DashboardLayout.SectionContent>
        <Tabs.Root defaultValue="details" className="mx-auto w-full max-w-6xl">
          <Tabs.List variant="line" className="mb-4">
            <Tabs.Tab value="details">
              <Trans message="Details" />
            </Tabs.Tab>
            <Tabs.Tab value="history">
              <Trans message="History" />
            </Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="details">
            <DetailsPanel product={product} />
          </Tabs.Panel>
          <Tabs.Panel value="history">
            <HistoryPanel history={product.history ?? []} />
          </Tabs.Panel>
        </Tabs.Root>
      </DashboardLayout.SectionContent>

      <Dialog.Root open={rejectOpen} onOpenChange={setRejectOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop />
          <Dialog.Content className="sm:max-w-lg">
            <Dialog.Header>
              <Dialog.Title>
                <Trans message="Reject product" />
              </Dialog.Title>
              <Dialog.Description>
                <Trans message="Explain what the creator should change. This is sent with the rejection." />
              </Dialog.Description>
            </Dialog.Header>
            <Dialog.Body>
              <Field.Root>
                <Field.Label htmlFor="detail-rejection-reason">
                  <Trans message="Rejection reason" />
                </Field.Label>
                <Textarea
                  id="detail-rejection-reason"
                  rows={4}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Explain what the creator should change."
                />
              </Field.Root>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="outline" onClick={() => setRejectOpen(false)}>
                <Trans message="Cancel" />
              </Button>
              <Button
                variant="outline"
                color="danger"
                disabled={reject.isPending}
                onClick={() => reject.mutate()}
              >
                <XIcon />
                <Trans message="Reject" />
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </DashboardLayout.MainSection>
  );
}

function DetailsPanel({product}: {product: AdminProductDetail}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card.Root>
          <Card.Content className="space-y-4 p-4">
            {product.cover?.url ? (
              <img
                src={product.cover.url}
                alt={product.title}
                className="aspect-video w-full rounded-card border object-cover"
              />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center rounded-card border bg-muted text-muted-foreground">
                <FileIcon className="size-6" aria-hidden="true" />
              </div>
            )}
            {product.description ? (
              looksLikeHtml(product.description) ? (
                <div
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{__html: product.description}}
                />
              ) : (
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {product.description}
                </p>
              )
            ) : (
              <p className="text-sm text-muted-foreground">
                <Trans message="No description provided." />
              </p>
            )}
          </Card.Content>
        </Card.Root>

        {product.learning_outcomes && product.learning_outcomes.length > 0 && (
          <Card.Root>
            <Card.Header>
              <Card.Title>
                <Trans message="Learning outcomes" />
              </Card.Title>
            </Card.Header>
            <Card.Content>
              <ul className="list-disc space-y-1 ps-5 text-sm">
                {product.learning_outcomes.map((outcome, index) => (
                  <li key={index}>{outcome}</li>
                ))}
              </ul>
            </Card.Content>
          </Card.Root>
        )}

        <Card.Root>
          <Card.Header>
            <Card.Title>
              <Trans message="Files" />
            </Card.Title>
          </Card.Header>
          <Card.Content className="space-y-2">
            {product.files && product.files.length > 0 ? (
              product.files.map(file => (
                <div
                  key={file.id}
                  className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {file.extension.toUpperCase()} •{' '}
                      {prettyBytes(file.file_size)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    nativeButton={false}
                    render={
                      <a href={file.url} target="_blank" rel="noreferrer" />
                    }
                  >
                    <Trans message="Download" />
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                <Trans message="No files attached." />
              </p>
            )}
          </Card.Content>
        </Card.Root>

        {product.is_course && product.course && (
          <Card.Root>
            <Card.Header>
              <Card.Title>
                <Trans message="Course" />
              </Card.Title>
            </Card.Header>
            <Card.Content className="grid gap-3 sm:grid-cols-3">
              <DetailStat
                label="Chapters"
                value={String(product.course.chapters_count)}
              />
              <DetailStat
                label="Lessons"
                value={String(product.course.lessons_count)}
              />
              <DetailStat
                label="Published lessons"
                value={String(product.course.published_lessons_count)}
              />
            </Card.Content>
          </Card.Root>
        )}
      </div>

      <Card.Root className="h-fit">
        <Card.Header>
          <Card.Title>
            <Trans message="Product info" />
          </Card.Title>
        </Card.Header>
        <Card.Content className="space-y-3 text-sm">
          <DetailRow label="ID">
            {String(product.id).padStart(4, '0')}
          </DetailRow>
          <DetailRow label="Type">{product.type ?? 'digital'}</DetailRow>
          <DetailRow label="Price">
            {product.price_cents === 0
              ? 'Free'
              : formatMoney(product.price_cents, product.currency)}
          </DetailRow>
          <DetailRow label="Creator">
            {product.creator ? (
              <span>
                {product.creator.name}
                <span className="block text-xs text-muted-foreground">
                  {product.creator.email}
                </span>
              </span>
            ) : (
              '—'
            )}
          </DetailRow>
          <DetailRow label="Status">{product.status}</DetailRow>
          {product.rejection_reason && (
            <DetailRow label="Rejection reason">
              <span className="text-destructive">
                {product.rejection_reason}
              </span>
            </DetailRow>
          )}
          <DetailRow label="Created">
            <FormattedDate date={product.created_at} />
          </DetailRow>
          <DetailRow label="Approved">
            <FormattedDate date={product.approved_at} />
          </DetailRow>
          <DetailRow label="Stores">
            {product.stores && product.stores.length > 0 ? (
              <span className="flex flex-col gap-1">
                {product.stores.map(store => (
                  <a
                    key={store.id}
                    href={store.short_url}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline"
                  >
                    {store.name}
                  </a>
                ))}
              </span>
            ) : (
              '—'
            )}
          </DetailRow>
          <DetailRow label="Sales">{String(product.sales_count)}</DetailRow>
          <DetailRow label="Reviews">{String(product.reviews_count)}</DetailRow>
        </Card.Content>
      </Card.Root>
    </div>
  );
}

function HistoryPanel({history}: {history: HistoryEvent[]}) {
  if (!history.length) {
    return (
      <Card.Root>
        <Card.Content className="py-10 text-center text-sm text-muted-foreground">
          <Trans message="No history recorded for this product yet." />
        </Card.Content>
      </Card.Root>
    );
  }

  return (
    <Card.Root>
      <Card.Content className="divide-y p-0">
        {history.map(event => (
          <div key={event.id} className="flex gap-3 p-4 text-sm">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">
                  {eventLabel(event.event)}
                </span>
                {event.from_status && event.to_status && (
                  <span className="text-xs text-muted-foreground">
                    {event.from_status} → {event.to_status}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {event.actor?.name ?? event.actor_role} ({event.actor_role})
                {' · '}
                <FormattedDate date={event.created_at} />
              </p>
              {event.reason && (
                <p className="text-xs text-destructive">
                  <Trans
                    message="Reason: :reason"
                    values={{reason: event.reason}}
                  />
                </p>
              )}
              {event.meta?.changed && event.meta.changed.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  <Trans
                    message="Changed: :fields"
                    values={{fields: event.meta.changed.join(', ')}}
                  />
                </p>
              )}
              {event.meta?.review_requested && (
                <p className="text-xs text-muted-foreground">
                  <Trans message="Queued for review" />
                </p>
              )}
            </div>
          </div>
        ))}
      </Card.Content>
    </Card.Root>
  );
}

function eventLabel(event: string) {
  switch (event) {
    case 'created':
      return 'Created';
    case 'updated':
      return 'Updated';
    case 'submitted':
      return 'Submitted for review';
    case 'update_submitted':
      return 'Update submitted for review';
    case 'approved':
      return 'Approved';
    case 'update_approved':
      return 'Update approved';
    case 'rejected':
      return 'Rejected';
    case 'update_rejected':
      return 'Update rejected';
    default:
      return event;
  }
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-end">{children}</span>
    </div>
  );
}

function DetailStat({label, value}: {label: string; value: string}) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">
        <Trans message={label} />
      </p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
```

- [ ] **Step 5: Register the route**

In `resources/client/admin/admin-routes.tsx`, add after the `digital-products/:productId/reviews` entry:

```tsx
      {
        path: 'digital-products/:productId',
        lazy: () =>
          import('@app/admin/digital-products/admin-digital-product-detail-page'),
      },
```

- [ ] **Step 6: Run the test and type-check**

Run: `npm run test -- resources/client/admin/digital-products/admin-product-detail.test.ts`
Expected: 7 passed.

Run: `npx tsc --noEmit --skipLibCheck`
Expected: exit 0. Fix any import/type errors raised by the new page (for example unused imports).

- [ ] **Step 7: Commit**

```bash
git add resources/client/admin/digital-products/admin-digital-product-detail-queries.ts \
        resources/client/admin/digital-products/admin-digital-product-detail-page.tsx \
        resources/client/admin/digital-products/admin-product-detail.test.ts \
        resources/client/admin/admin-routes.tsx
git commit -m "feat(admin): product detail page with details and history tabs"
```

---

## Task 4: Full verification

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

- **Spec coverage:** show endpoint + `whereNumber` + resource + `actor` relation + history cap (Task 1); shared display extraction + list title link (Task 2); query + route + page with Details/History/actions (Task 3); full verification (Task 4). Out-of-scope items (admin edit/delete, embedded Reviews/Orders, bulk, nested nav, notifications) have no tasks by design.
- **Type consistency:** `AdminDigitalProductResource` returns `has_pending_update`, `stores[].short_url`, `history[].actor_role`, `history[].from_status`, `history[].to_status`, `history[].meta.changed` — all consumed by the page. `adminDigitalProductDetailBaseKey` is used by the page's invalidation and the query module. `ProductStatusBadge`/`looksLikeHtml`/`AdminDigitalProduct` are produced in Task 2 and consumed in Task 3.
- **Known deliberate detail:** the page invalidates `adminDigitalProductDetailBaseKey` by literal `['adminDigitalProductDetail']` inside the component; the plan also exports the constant from the query module. Either is valid; keep them equal.
