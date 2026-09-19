# Product Moderation Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Notify creators (in-app + email) when an admin approves or rejects their product submission or an update to a live product.

**Architecture:** One queued `ProductModerationNotification` (`mail` + `database`) is dispatched from the single `applyDecision()` moderation helper, so single approve/reject and bulk endpoints all notify. The product is loaded by id inside the notification; `shouldSend` cancels when the product no longer exists.

**Tech Stack:** Laravel 11 (PHP 8.2), Laravel Notifications (mail + database channels), Pest/PHPUnit feature tests.

**Spec:** `docs/superpowers/specs/2026-09-19-product-moderation-notifications-design.md`

**Stacked branch:** this branch is based on `feat/admin-bulk-product-moderation` (PR #25) because `applyDecision()` does not exist on `main`. The PR targets `main` and merges after #25.

## Global Constraints

- Work on branch `feat/product-moderation-notifications` (already checked out on top of the bulk branch).
- ddev project: run PHP/artisan/pest via `ddev exec` (e.g. `ddev exec ./vendor/bin/pest ...`).
- `Model::preventLazyLoading()` is active outside production (including tests) — eager-load the creator in `applyDecision`; never lazy-load.
- In-app notification `lines[].content` is rendered as HTML by the client — escape product titles and rejection reasons with `e()`.
- Notify only for admin moderation outcomes: `approved`, `rejected`, `update_approved`, `update_rejected`. Never for creator-initiated submit auto-approval or course auto-publish.
- Do not touch or stage `NUL`, `public/build/manifest.json`, or unrelated work.
- Verify before any PR: `npx tsc --noEmit --skipLibCheck`, `npm run test`, `npm run build`, `ddev exec ./vendor/bin/pest`, then `git restore public/build/manifest.json`.
- Do not commit, push, or open a PR unless the user explicitly asks.

---

## File Structure

**Create**
- `app/Storefront/Notifications/ProductModerationNotification.php`
- `tests/Feature/ProductModerationNotificationTest.php`

**Modify**
- `app/Storefront/Controllers/AdminDigitalProductsController.php` (`applyDecision()`)

---

## Task 1: Notification class and dispatch

**Files:**
- Create: `app/Storefront/Notifications/ProductModerationNotification.php`
- Create: `tests/Feature/ProductModerationNotificationTest.php`
- Modify: `app/Storefront/Controllers/AdminDigitalProductsController.php`

**Interfaces:**
- Consumes: `DigitalProduct` (`creator`, `cover`, `isCourse()`, `SoftDeletes`), the moderation endpoints (`approve`, `reject`, `bulk-approve`, `bulk-reject`).
- Produces: `ProductModerationNotification::__construct(int $productId, string $event, ?string $reason = null)`; dispatched to the creator from `applyDecision()`.

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/ProductModerationNotificationTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Notifications\ProductModerationNotification;
use Common\Permissions\Models\Permission;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\Models\Workspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProductModerationNotificationTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        ActiveWorkspace::clearCache();
        parent::tearDown();
    }

    public function testApprovingNotifiesCreatorOnMailAndDatabaseChannels(): void
    {
        Notification::fake();
        $admin = $this->createAdmin();
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator, ['status' => 'pending_approval']);

        $this->stateful()->actingAs($admin)
            ->postJson("/api/v1/admin/digital-products/{$product->id}/approve")
            ->assertOk();

        Notification::assertSentTo(
            $creator,
            ProductModerationNotification::class,
            function (ProductModerationNotification $notification, array $channels) use ($product): bool {
                return $notification->productId === $product->id
                    && $notification->event === 'approved'
                    && in_array('mail', $channels, true)
                    && in_array('database', $channels, true);
            },
        );
    }

    public function testRejectingAndUpdateOutcomesNotifyWithTheRightEvent(): void
    {
        Notification::fake();
        $admin = $this->createAdmin();
        [$creator, $workspace] = $this->creatorContext();

        $pending = $this->product($workspace, $creator, ['status' => 'pending_approval']);
        $toApprove = $this->updatedProduct($workspace, $creator);
        $toReject = $this->updatedProduct($workspace, $creator);

        $this->stateful()->actingAs($admin)->postJson(
            "/api/v1/admin/digital-products/{$pending->id}/reject",
            ['reason' => 'Missing files'],
        )->assertOk();

        $this->stateful()->actingAs($admin)->postJson(
            "/api/v1/admin/digital-products/{$toApprove->id}/approve",
        )->assertOk();

        $this->stateful()->actingAs($admin)->postJson(
            "/api/v1/admin/digital-products/{$toReject->id}/reject",
            ['reason' => 'Price too high'],
        )->assertOk();

        Notification::assertSentTo(
            $creator,
            ProductModerationNotification::class,
            fn (ProductModerationNotification $n): bool => $n->productId === $pending->id
                && $n->event === 'rejected'
                && $n->reason === 'Missing files',
        );
        Notification::assertSentTo(
            $creator,
            ProductModerationNotification::class,
            fn (ProductModerationNotification $n): bool => $n->productId === $toApprove->id
                && $n->event === 'update_approved',
        );
        Notification::assertSentTo(
            $creator,
            ProductModerationNotification::class,
            fn (ProductModerationNotification $n): bool => $n->productId === $toReject->id
                && $n->event === 'update_rejected'
                && $n->reason === 'Price too high',
        );
    }

    public function testBulkApproveNotifiesEachActionableCreatorOnly(): void
    {
        Notification::fake();
        $admin = $this->createAdmin();
        [$creatorA, $workspaceA] = $this->creatorContext();
        [$creatorB, $workspaceB] = $this->creatorContext();

        $first = $this->product($workspaceA, $creatorA, ['status' => 'pending_approval']);
        $second = $this->product($workspaceA, $creatorA, ['status' => 'pending_approval']);
        $draft = $this->product($workspaceB, $creatorB, ['status' => 'draft']);

        $this->stateful()->actingAs($admin)->postJson(
            '/api/v1/admin/digital-products/bulk-approve',
            ['ids' => [$first->id, $second->id, $draft->id]],
        )->assertOk();

        Notification::assertSentToTimes($creatorA, ProductModerationNotification::class, 2);
        Notification::assertNotSentTo($creatorB, ProductModerationNotification::class);
    }

    public function testApprovingPersistsADatabaseNotification(): void
    {
        $admin = $this->createAdmin();
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator, ['status' => 'pending_approval']);

        $this->stateful()->actingAs($admin)
            ->postJson("/api/v1/admin/digital-products/{$product->id}/approve")
            ->assertOk();

        $this->assertSame(1, $creator->notifications()->count());
        $this->assertSame(
            ProductModerationNotification::class,
            $creator->notifications()->first()->type,
        );
    }

    public function testToMailAndShouldSendGuardDeletedProducts(): void
    {
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator, ['status' => 'rejected']);

        $notification = new ProductModerationNotification($product->id, 'rejected', 'Bad');

        $this->assertInstanceOf(MailMessage::class, $notification->toMail($creator));
        $this->assertTrue($notification->shouldSend($creator, 'mail'));

        $product->delete();

        $this->assertFalse($notification->shouldSend($creator, 'mail'));
    }

    private function updatedProduct(Workspace $workspace, User $creator): DigitalProduct
    {
        return $this->product($workspace, $creator, [
            'status' => 'approved',
            'approved_at' => now()->subDay(),
            'review_requested_at' => now(),
            'review_requested_by' => $creator->id,
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

- [ ] **Step 2: Run the test to verify it fails**

Run: `ddev exec ./vendor/bin/pest tests/Feature/ProductModerationNotificationTest.php`
Expected: FAIL — `App\Storefront\Notifications\ProductModerationNotification` not found.

- [ ] **Step 3: Create the notification**

Create `app/Storefront/Notifications/ProductModerationNotification.php`:

```php
<?php

namespace App\Storefront\Notifications;

use App\Storefront\Models\DigitalProduct;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ProductModerationNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [60, 300, 900];

    public function __construct(
        public int $productId,
        public string $event,
        public ?string $reason = null,
    ) {
        $this->onQueue('default');
    }

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function viaQueues(): array
    {
        return [
            'mail' => 'mail',
            'database' => 'default',
        ];
    }

    public function shouldSend(object $notifiable, string $channel): bool
    {
        return DigitalProduct::whereKey($this->productId)->exists();
    }

    public function toMail(object $notifiable): MailMessage
    {
        $product = $this->product();

        $mail = (new MailMessage())
            ->subject($this->subject())
            ->greeting(__('Hello, :name', ['name' => $notifiable->name]))
            ->line($this->summary($product));

        if ($this->isRejection() && $this->reason) {
            $mail->line(__('Reason: :reason', ['reason' => $this->reason]));
        }

        return $mail->action($this->actionLabel(), url($this->actionPath($product)));
    }

    public function toDatabase(object $notifiable): array
    {
        $product = $this->product();

        $lines = [
            ['content' => e($this->summary($product)), 'type' => 'primary'],
        ];

        if ($this->isRejection() && $this->reason) {
            $lines[] = [
                'content' => e(__('Reason: :reason', ['reason' => $this->reason])),
                'type' => 'secondary',
            ];
        }

        return [
            'mainAction' => [
                'label' => $this->actionLabel(),
                'action' => url($this->actionPath($product)),
            ],
            'lines' => $lines,
        ];
    }

    private function product(): DigitalProduct
    {
        return DigitalProduct::query()->with('cover')->findOrFail($this->productId);
    }

    private function isRejection(): bool
    {
        return in_array($this->event, ['rejected', 'update_rejected'], true);
    }

    private function subject(): string
    {
        return match ($this->event) {
            'approved' => __('Your product is live'),
            'update_approved' => __('Your product update is live'),
            'rejected' => __('Your product needs changes'),
            'update_rejected' => __('Your product update needs changes'),
            default => __('Product update'),
        };
    }

    private function summary(DigitalProduct $product): string
    {
        return match ($this->event) {
            'approved' => __('Your product ":title" is now live.', ['title' => $product->title]),
            'update_approved' => __('Your update to ":title" is now live.', ['title' => $product->title]),
            'rejected' => __('Your product ":title" needs changes.', ['title' => $product->title]),
            'update_rejected' => __('Your update to ":title" needs changes.', ['title' => $product->title]),
            default => __('Your product ":title" was updated.', ['title' => $product->title]),
        };
    }

    private function actionLabel(): string
    {
        return $this->isRejection()
            ? __('Fix and resubmit')
            : __('Open product');
    }

    private function actionPath(DigitalProduct $product): string
    {
        return $product->isCourse()
            ? "/dashboard/my-products/{$product->id}/course"
            : "/dashboard/my-products/{$product->id}/edit";
    }
}
```

- [ ] **Step 4: Dispatch from applyDecision**

In `app/Storefront/Controllers/AdminDigitalProductsController.php`, add the import:

```php
use App\Storefront\Notifications\ProductModerationNotification;
```

Replace `applyDecision()` with:

```php
    /**
     * Apply one moderation decision under a row lock. Returns null when the
     * product is missing or not actionable, so bulk calls can skip it.
     */
    private function applyDecision(int $id, bool $approve, ?string $reason, User $actor): ?DigitalProduct
    {
        $result = DB::transaction(function () use ($id, $approve, $reason, $actor): ?array {
            $product = DigitalProduct::query()
                ->with('creator')
                ->whereKey($id)
                ->lockForUpdate()
                ->first();

            if (!$product) {
                return null;
            }

            $isUpdate = $product->status === 'approved' && $product->review_requested_at !== null;
            if ($product->status !== 'pending_approval' && !$isUpdate) {
                return null;
            }

            $from = $product->status;

            if ($approve) {
                $event = $isUpdate ? 'update_approved' : 'approved';

                $product->update([
                    'status' => 'approved',
                    'approved_at' => now(),
                    'rejection_reason' => null,
                    'review_requested_at' => null,
                    'review_requested_by' => null,
                ]);

                app(ProductReviewHistory::class)->record(
                    $product,
                    $event,
                    $from,
                    'approved',
                    $actor,
                    'admin',
                );
            } else {
                $event = $isUpdate ? 'update_rejected' : 'rejected';

                $product->update([
                    'status' => 'rejected',
                    'rejection_reason' => $reason,
                    'review_requested_at' => null,
                    'review_requested_by' => null,
                ]);

                app(ProductReviewHistory::class)->record(
                    $product,
                    $event,
                    $from,
                    'rejected',
                    $actor,
                    'admin',
                    $reason,
                );
            }

            return ['product' => $product, 'event' => $event];
        });

        if ($result === null) {
            return null;
        }

        $result['product']->creator?->notify(
            new ProductModerationNotification($result['product']->id, $result['event'], $reason),
        );

        return $result['product'];
    }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `ddev exec ./vendor/bin/pest tests/Feature/ProductModerationNotificationTest.php`
Expected: 5 passed.

- [ ] **Step 6: Run regression suites**

Run: `ddev exec ./vendor/bin/pest tests/Feature/AdminBulkProductModerationTest.php tests/Feature/AdminProductReviewQueueTest.php tests/Feature/ProductApprovalPipelineTest.php`
Expected: all pass (the notification dispatch must not change moderation behavior).

- [ ] **Step 7: Commit**

```bash
git add app/Storefront/Notifications/ProductModerationNotification.php \
        app/Storefront/Controllers/AdminDigitalProductsController.php \
        tests/Feature/ProductModerationNotificationTest.php
git commit -m "feat(products): notify creators when moderation decisions are made"
```

---

## Task 2: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Type-check**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: exit 0.

- [ ] **Step 2: Frontend tests**

Run: `npm run test`
Expected: all pass.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: `✓ built in ...`.

- [ ] **Step 4: Restore the tracked build artifact**

Run: `git restore public/build/manifest.json`

- [ ] **Step 5: Backend tests**

Run: `ddev exec ./vendor/bin/pest`
Expected: 0 failures (skips allowed).

- [ ] **Step 6: Report**

Report the raw output of all four commands and wait for explicit approval before creating a PR.

---

## Self-Review Notes

- **Spec coverage:** notification class with four events, mail + database channels, escaped in-app lines, `shouldSend` guard, dispatch from `applyDecision`, and tests 1-5 are all in Task 1. Out-of-scope items (preferences, digests, admin notifications, submit/auto-approve) have no tasks by design.
- **Type consistency:** `ProductModerationNotification` is constructed as `(int $productId, string $event, ?string $reason)` in both the test and the controller. Event strings (`approved`, `rejected`, `update_approved`, `update_rejected`) match between the controller and the notification's `match` arms and `isRejection()`.
- **Known deliberate detail:** `shouldSend` uses a non-trashed lookup so soft-deleted products cancel; `product()` therefore also uses a non-trashed `findOrFail`, and every send path is guarded by `shouldSend`.
