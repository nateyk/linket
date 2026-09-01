# Digital Product Mutation Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move digital-product create and update mutations from `DigitalProductsController` into one injectable service without changing API behavior.

**Architecture:** `DigitalProductMutationService` owns the transaction that creates or updates a product, verifies cover/file workspace ownership, synchronizes files and Storefront placement, and ensures course records. `DigitalProductsController` remains responsible for HTTP validation, authorization, entitlement limits, and response resources; submission remains untouched.

**Tech Stack:** Laravel 12, Eloquent, PHPUnit, DDEV.

**Spec:** `docs/superpowers/specs/2026-09-01-digital-product-mutation-service-design.md`

## Global Constraints

- Preserve all existing digital-product routes, payloads, status transitions, response resources, and `422` messages.
- Do not alter payment, order, payout, entitlement, protected-download, enrollment, or submission behavior.
- Use constructor injection for `CourseService` and `DigitalProductVisibility`; do not call `app()` inside the new service.
- Keep product count and course-creation entitlement checks in `DigitalProductsController`.
- Run PHP commands through `ddev exec`.
- Do not stage, commit, or alter unrelated existing worktree changes.

---

### Task 1: Add Mutation-Service Coverage

**Files:**
- Create: `tests/Feature/DigitalProductMutationServiceTest.php`
- Test: `tests/Feature/DigitalProductMutationServiceTest.php`

**Interfaces:**
- Consumes: `App\Storefront\DigitalProductMutationService::create(array $data, User $creator, ?int $maxUploadBytes): DigitalProduct`.
- Produces: a direct service-level contract for valid creation and rejected cross-workspace file input.

- [ ] **Step 1: Write the failing service tests**

Create the test class with `DatabaseTransactions`, workspace setup, and two direct calls to the intended service:

```php
public function testCreatesProductAndSynchronizesItsFiles(): void
{
    $product = app(DigitalProductMutationService::class)->create(
        [
            'title' => 'Guide',
            'price_cents' => 1000,
            'file_ids' => [$file->id],
        ],
        $creator,
        null,
    );

    $this->assertSame($workspace->id, $product->workspace_id);
    $this->assertSame([$file->id], $product->files()->pluck('id')->all());
}

public function testRejectsFileFromAnotherWorkspace(): void
{
    $this->expectException(HttpException::class);
    $this->expectExceptionCode(422);

    app(DigitalProductMutationService::class)->create(
        [
            'title' => 'Guide',
            'price_cents' => 1000,
            'file_ids' => [$foreignFile->id],
        ],
        $creator,
        null,
    );
}
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `ddev exec php artisan test tests/Feature/DigitalProductMutationServiceTest.php`

Expected: FAIL because `DigitalProductMutationService` does not exist.

- [ ] **Step 3: Commit the failing test only if the repository workflow explicitly requires a red commit**

Do not commit by default. If explicitly requested, stage only `tests/Feature/DigitalProductMutationServiceTest.php` and commit with:

```bash
git commit -m "test(storefront): cover product mutation service"
```

### Task 2: Implement the Mutation Service

**Files:**
- Create: `app/Storefront/DigitalProductMutationService.php`
- Modify: `app/Storefront/Controllers/DigitalProductsController.php:41-125`
- Test: `tests/Feature/DigitalProductMutationServiceTest.php`

**Interfaces:**
- Consumes: validated product payloads, `User`, `DigitalProduct`, an optional per-file byte limit, `CourseService`, and `DigitalProductVisibility`.
- Produces:

```php
public function create(array $data, User $creator, ?int $maxUploadBytes): DigitalProduct;
public function update(DigitalProduct $product, array $data, ?int $maxUploadBytes): DigitalProduct;
```

- [ ] **Step 1: Implement constructor-injected dependencies and `create`**

```php
public function __construct(
    private readonly CourseService $courses,
    private readonly DigitalProductVisibility $visibility,
) {}

public function create(array $data, User $creator, ?int $maxUploadBytes): DigitalProduct
{
    return DB::transaction(function () use ($data, $creator, $maxUploadBytes): DigitalProduct {
        $type = $data['type'] ?? 'digital';
        $product = DigitalProduct::create([
            ...Arr::except($data, ['file_ids', 'biolink_ids', 'type']),
            'type' => $type,
            'user_id' => $creator->id,
            'workspace_id' => ActiveWorkspace::get()->id,
            'currency' => $data['currency'] ?? config('storefront.currency'),
        ]);

        $this->assertCoverBelongsToWorkspace($product);
        if ($type === 'course') $this->courses->ensureForProduct($product);
        $this->syncProductFiles($product, $data, $type, $maxUploadBytes);
        $this->visibility->sync($product, $data['biolink_ids'] ?? []);

        return $product->fresh()->load(['files', 'cover', 'biolinks', 'course']);
    });
}
```

Keep the existing allowed-extension, workspace, and storage-limit queries and messages byte-for-byte equivalent when moving `syncFiles` and `assertCoverBelongsToWorkspace` into the service.

- [ ] **Step 2: Implement `update` with existing course file semantics**

```php
public function update(DigitalProduct $product, array $data, ?int $maxUploadBytes): DigitalProduct
{
    return DB::transaction(function () use ($product, $data, $maxUploadBytes): DigitalProduct {
        $type = $data['type'] ?? $product->type ?? 'digital';
        $product->update([
            ...Arr::except($data, ['file_ids', 'biolink_ids', 'type']),
            'type' => $type,
            'currency' => $data['currency'] ?? $product->currency,
            'status' => $product->status === 'approved' ? 'draft' : $product->status,
        ]);

        $this->assertCoverBelongsToWorkspace($product);
        $this->syncProductFiles($product, $data, $type, $maxUploadBytes);
        if ($type === 'course') $this->courses->ensureForProduct($product->fresh());
        $this->visibility->sync(
            $product,
            $data['biolink_ids'] ?? $product->biolinks()->pluck('biolinks.id')->all(),
        );

        return $product->fresh()->load(['files', 'cover', 'biolinks', 'course']);
    });
}
```

`syncProductFiles` must require and sync `file_ids` for non-course products. For course products it must preserve files when the key is omitted, sync the provided IDs when non-empty, and clear associations when the key is present with an empty array.

- [ ] **Step 3: Replace controller mutation internals with service calls**

Inject `DigitalProductMutationService` through the controller constructor. After existing `validated`, `assertOwner`, entitlement, and product-limit logic, replace each transaction closure with:

```php
$product = $this->mutations->create(
    $data,
    $creator,
    $entitlements->limit($creator, 'max_upload_bytes'),
);

return new DigitalProductResource($product);
```

For updates, call `update($digitalProduct, $data, $entitlements->limit(...))`. Remove the controller's migrated `syncFiles` and `assertCoverBelongsToWorkspace` private methods and their no-longer-used imports. Do not change `submit` or `destroy`.

- [ ] **Step 4: Run the direct service tests to verify they pass**

Run: `ddev exec php artisan test tests/Feature/DigitalProductMutationServiceTest.php`

Expected: PASS, including foreign-file rejection.

- [ ] **Step 5: Commit the implementation only when explicitly requested**

If requested, stage only the new service, controller, and direct service test. Use:

```bash
git commit -m "refactor(storefront): extract product mutations"
```

### Task 3: Verify API Regression Coverage

**Files:**
- Modify: none expected
- Test: `tests/Feature/CourseSystemTest.php`
- Test: `tests/Feature/DigitalProductMutationServiceTest.php`

**Interfaces:**
- Consumes: the extracted mutation service through existing create/update endpoints.
- Produces: evidence that endpoint contracts and workspace security behavior are unchanged.

- [ ] **Step 1: Run the course workflow suite**

Run: `ddev exec php artisan test tests/Feature/CourseSystemTest.php`

Expected: PASS, including course creation, foreign cover/file rejection, Storefront placement, and submission rules.

- [ ] **Step 2: Run static checks available in this repository**

Run:

```bash
git diff --check
ddev exec vendor/bin/phpstan analyse app/Storefront/DigitalProductMutationService.php app/Storefront/Controllers/DigitalProductsController.php
```

Expected: no whitespace errors and no PHPStan errors. If `vendor/bin/phpstan` is unavailable, record that fact and do not install dependencies solely for this refactor.

- [ ] **Step 3: Review the diff against the spec**

Confirm that create/update behavior moved to the service, while validation, ownership, entitlement checks, response resources, submit, and destroy remain in the controller. Confirm no protected commerce flow changed.

- [ ] **Step 4: Commit verification only when explicitly requested**

Do not create a verification-only commit unless the user explicitly asks for one.
