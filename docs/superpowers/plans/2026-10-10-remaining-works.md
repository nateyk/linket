# Remaining Works (Post-Impeccable-Pass) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining defects the product-flow UI/UX pass deferred: a working auto-save (backend endpoint + frontend stale-closure fix), dead sidebar/mobile menu links, heading/progress consistency, nested-card cleanup on sibling dialogs, translation-catalog hygiene, and the token-starved dev environment.

**Architecture:** Three independent tracks that each ship working software: (A) full-stack auto-save — a relaxed `PUT /api/v1/items/{id}/draft` endpoint in the foundation routes + a latest-ref fix to the debounced writer in the product-creation context; (B) data/layout fixes — one menu-fixing migration plus three small frontend consistency fixes; (C) hygiene — dead i18n key removal, an env seeding runbook, and an optional detector supplement script.

**Tech Stack:** Laravel (routes in `common/foundation/routes/api.php`), PHP feature tests (tests/Feature), React 19 + TypeScript + Base UI, vitest + @testing-library, `just-debounce-it` (exposes `.cancel()`/`.flush()`, see `node_modules/just-debounce-it/index.d.ts`), `npm run extract` for i18n.

**Spec:** `/home/nate/audits/product-flow/impeccable/LEDGER.md` (final whole-branch review section + deferred-minors rulings) and `/home/nate/audits/product-flow/impeccable/audit-report.md` (P1 auto-save finding). Reports `t*-report.md` / `p2-report.md` / `finalfix-report.md` hold the evidence each fix argues from.

## Global Constraints

- Frontend-only **except** Task 1 (backend route/controller) and Task 3 (migration) — nothing else may touch PHP.
- Design-system tokens only; no new colors, no physical `mr-/ml-/pl-/pr-` classes (logical props only).
- All visible copy through `<Trans>`/`trans({message})`; after copy changes run `npm run extract` — catalog must stay **additive-only EXCEPT Task 7**, the deliberate dead-key removal.
- Prior accessibility batch guarantees must not regress: R06 (radiogroup semantics/arrow nav/visible focus), R07 (wizard nav landmark + per-step names + aria-current), R08 (dialog discard-confirm), R09, R13 (progress roles/visible count), R18.
- Approved work committed at `c0c670cf` is the baseline; the worktree contains only other-stream files (`docs/superpowers/plans/2026-10-10-blog-phase-3-seo-layer.md`) — do not touch them.
- Verification commands (every task): `npx vitest run resources/client/dashboard/... <touched dirs>`, `npx tsc --noEmit`, `npx oxlint <touched dirs>`; backend tasks: `php artisan test --filter=<TestName>` (run inside ddev: `ddev ssh`).
- Browser checks: GET/HEAD only via `pageWithIdentity` guard from `/home/nate/audits/product-flow/data/ux-polish.cjs`; **API status codes are unreliable** — unmatched routes fall through to the SPA fallback (200 HTML for GET, misleading 405 "Supported methods: GET, HEAD" for PUT). Verify route existence by response **body** (JSON vs HTML) or `php artisan route:list`.
- Each task commits its own work (step shown); nothing gets pushed.

## Review Focus

Failure modes the spec implies that no single task's tests fully cover — each gets its test in the owning task:

1. **Auto-save silently reverts an APPROVED product to draft 1.5s after a keystroke.** The edit-page banner promises the approved→draft revert happens on *Save* (user-explained action); `DigitalProductMutationService::update()` runs approved-snapshot/re-review logic on every call. Expected: auto-save never fires for approved/pending products — only explicit Save does. → Task 2 test: `status=approved` + dirty → no PUT after debounce; `status=draft` + dirty → PUT.
2. **Draft endpoint 403s or 422s the very inputs it exists to accept** (empty title while typing, `file_ids: []` mid-edit). `validated()` requires `title` + `file_ids min:1` — the draft rules must relax exactly those and nothing else. → Task 1 tests: empty-title 200, empty file_ids 200, non-owner 403, strict `update()` still 422s the same input.
3. **Auto-save payload races hydration and wipes files** (`file_ids: []` synced before product GET hydrates files). Expected: no PUT before hydrate (`dirty` starts false and `hydrate()` resets it — assert it). → Task 2 test: render → immediate keystroke-equivalent with `dirty=false` → no PUT; after `hydrate()` + edit → PUT carries hydrated `file_ids`.
4. **Menu migration misses rows**: menus are JSON rows in `custom_menus` across `dashboard-primary`, `dashboard-mobile`, and user-custom menus; a partial update leaves live dead links. Expected: zero `/dashboard/my-products` actions remain post-migrate, in every menu. → Task 3 test asserts count = 0 after `migrate:fresh --seed`-style in-memory run (see task).
5. **i18n key removal breaks a dynamically-referenced string** (key assembled or referenced via variable). Expected: removed keys are provably unreferenced and `npm run extract` does not re-add them. → Task 7 verification steps.

---

### Task 1: Backend `PUT /api/v1/items/{digitalProduct}/draft`

**Files:**
- Modify: `common/foundation/routes/api.php` (register beside the items resource at :239-241)
- Modify: `app/Storefront/Controllers/DigitalProductsController.php` (add `saveDraft()` + `validatedDraft()` beside `update()` :67-85 and `validated()` :164-185)
- Test: `tests/Feature/ProductDraftAutosaveTest.php` (create; mirror the auth/workspace setup of `tests/Feature/ProductUpdateRevertTest.php`)

**Interfaces:**
- Consumes: `DigitalProductMutationService::update(DigitalProduct $product, array $data, ?int $maxUploadBytes, ?User $actor = null)` — confirmed partial-tolerant (`$data['type'] ?? $product->type`, currency/files/biolinks fall back to current values when key absent, `app/Storefront/DigitalProductMutationService.php:60-95`).
- Produces: `PUT /api/v1/items/{digitalProduct}/draft` → `DigitalProductResource` JSON; request body keys exactly what the frontend already sends: `title, description, price_cents, currency, cover_file_entry_id, file_ids, biolink_ids, type`. Task 2 depends on this path and payload.

- [ ] **Step 1: Write the failing feature test**

Create `tests/Feature/ProductDraftAutosaveTest.php` with four tests (setup mirroring `ProductUpdateRevertTest.php`: acting-as creator, seeded workspace, an owned draft `DigitalProduct`):

```php
public function test_owner_can_autosave_draft_with_empty_title_and_no_files(): void
{
    // PUT /api/v1/items/{id}/draft with ['title' => '', 'price_cents' => 0, 'file_ids' => []]
    // assertStatus(200); fresh product keeps its previous non-empty title;
    // price_cents is 0; files relation is empty.

public function test_draft_endpoint_accepts_payload_that_strict_update_rejects(): void
{
    // same body to PUT /api/v1/items/{id} (update) → assertStatus(422)  // title/file_ids required
    // same body to .../draft → assertStatus(200)

public function test_non_owner_cannot_autosave_draft(): void
{
    // actingAs(otherUser) PUT .../draft → assertStatus(403)

public function test_draft_route_exists_and_is_not_spa_fallback(): void
{
    // PUT /api/v1/items/{id}/draft with JSON body → header('Content-Type') contains 'json'
    // (the SPA fallback returns text/html; status codes alone are unreliable — see Global Constraints)
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `ddev ssh && php artisan test --filter=ProductDraftAutosaveTest`
Expected: FAIL — route 404/405 (no route) or controller method missing; test 3 may fail for the wrong reason (404 instead of 403) — that is still RED.

- [ ] **Step 3: Register the route**

In `common/foundation/routes/api.php`, directly after line 241 (`Route::post('items/{digitalProduct}/submit', ...)`), add — matching the file's existing import style for `DigitalProductsController`:

```php
Route::put('items/{digitalProduct}/draft', [DigitalProductsController::class, 'saveDraft']);
```

Verify registration: `php artisan route:list --path=items/draft` shows `PUT api/v1/items/{digitalProduct}/draft`.

- [ ] **Step 4: Implement `saveDraft()` and `validatedDraft()`**

In `app/Storefront/Controllers/DigitalProductsController.php`, beside `update()`:

```php
public function saveDraft(Request $request, DigitalProduct $digitalProduct)
{
    $this->assertOwner($digitalProduct, $request);
    $data = $this->validatedDraft($request, $digitalProduct);
    // mirror update() :71-82 exactly (entitlements course check, enforceProductLimitForType,
    // $this->mutations->update(...)) — but NO enforcePricePolicy (see below).
    return new DigitalProductResource($product);
}

/** Draft autosave rules: relax exactly validated()'s two hard requirements
 *  (title required, file_ids min:1) and skip ProductSettings::enforcePricePolicy —
 *  price policy is enforced by update()/submit(), not by keystroke saves. */
private function validatedDraft(Request $request, DigitalProduct $existing): array
{
    $data = $request->validate([
        'title' => 'sometimes|nullable|string|max:160',
        'description' => 'sometimes|nullable|string|max:20000',
        'price_cents' => 'sometimes|nullable|integer|min:0',
        'currency' => 'sometimes|nullable|in:etb,ETB',
        'cover_file_entry_id' => 'sometimes|nullable|integer|exists:file_entries,id',
        'type' => 'sometimes|nullable|in:digital,ebook,audio,course',
        'file_ids' => 'sometimes|nullable|array',
        'file_ids.*' => 'integer|distinct|exists:file_entries,id',
        'biolink_ids' => 'sometimes|nullable|array',
        'biolink_ids.*' => 'integer|distinct|exists:biolinks,id',
    ]);
    // Drop nulls so partial saves keep existing column values; KEEP 0 and [] (meaningful).
    return array_filter($data, static fn ($v) => $v !== null);
}
```

Choice pinned: `array_filter(... !== null)` — never `array_filter($data)` (that would drop `price_cents: 0` and `file_ids: []`, the two values this endpoint exists to accept).

- [ ] **Step 5: Run tests to verify they pass**

Run: `ddev ssh && php artisan test --filter=ProductDraftAutosaveTest`
Expected: PASS (4/4).

- [ ] **Step 6: Regression gate on strict update**

Run: `ddev ssh && php artisan test --filter=ProductUpdateRevertTest`
Expected: PASS — `validated()` untouched.

- [ ] **Step 7: Commit**

```bash
git add common/foundation/routes/api.php app/Storefront/Controllers/DigitalProductsController.php tests/Feature/ProductDraftAutosaveTest.php
git commit -m "feat(items): PUT /items/{id}/draft endpoint for edit-page auto-save"
```

---

### Task 2: Frontend auto-save — stale-closure fix + approved/draft gating

**Files:**
- Modify: `resources/client/dashboard/digital-products/product-creation-context.tsx:152-175` (`autoSaveRef`/`autoSave`)
- Modify: `resources/client/dashboard/digital-products/digital-product-form-page.tsx:166-168` (trigger effect — add status gate)
- Test: `resources/client/dashboard/digital-products/product-creation-autosave.dom.test.tsx` (create)

**Interfaces:**
- Consumes: Task 1's `PUT /api/v1/items/{id}/draft`; existing context API (`hydrate`, `dirty`, `actions.autoSave`) unchanged — Task 2 must not change the `value`/`actions` shape that T2's load-effect fix and P2 depend on.
- Produces: unchanged public API; behavior contract: after 1500ms idle with `dirty && status==='draft'`, exactly one PUT with **current** state; `.cancel()` on provider unmount.

- [ ] **Step 1: Write the failing tests**

Create `product-creation-autosave.dom.test.tsx` (mock `@common/http/query-client`'s `apiClient.put` with `vi.fn()`; `vi.useFakeTimers()`; render the provider the way `digital-product-form-page.hydrate.dom.test.tsx` sets up):

```ts
test('debounced auto-save sends CURRENT state, not first-render state', async () => {
  // hydrate({title: 'Old', files: [...1 file], ...}); rerender; act: setTitle('New'); advance 1600ms
  // expect(apiClient.put).toHaveBeenCalledWith('/api/v1/items/1/draft',
  //   expect.objectContaining({title: 'New', file_ids: [<hydrated id>]}));
});

test('no auto-save fires before hydrate (dirty=false) and none after unmount', async () => {
  // mount → act: setTitle('X') without hydrate → advance 1600ms → expect(put).not.toHaveBeenCalled();
  // hydrate() → edit → unmount immediately → advance 1600ms → expect(put).toHaveBeenCalledTimes(0);
});

test('auto-save does not fire for approved products (explicit-Save-only revert)', async () => {
  // form-page effect level: render page with product.status='approved', hydrate+edit → advance 1600ms
  // → expect(put).not.toHaveBeenCalled(); repeat with status='draft' → called once.
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run resources/client/dashboard/digital-products/product-creation-autosave.dom.test.tsx`
Expected: FAIL — test 1 (first-render `dirty=false` → no call at all; with a forced dirty, first-render `title`); test 3 (no gate exists).

- [ ] **Step 3: Fix the stale closure with a latest-value ref**

In `product-creation-context.tsx`, keep `autoSaveRef = useRef(debounce(...), 1500)` but have the debounced body read through a ref updated on every render:

```ts
const latest = useRef({state, dirty, productId});
latest.current = {state, dirty, productId};          // assigned during render
const autoSaveRef = useRef(
  debounce(async () => {
    const {state, dirty, productId} = latest.current; // was: closed-over first-render values
    if (!productId || !dirty) return;
    ... existing PUT body using this `state` ...
  }, 1500),
);
useEffect(() => () => autoSaveRef.current.cancel(), []); // just-debounce-it exposes .cancel()
```

- [ ] **Step 4: Gate the trigger on draft status**

In `digital-product-form-page.tsx:166-168`, where `product` is in scope:

```ts
useEffect(() => {
  if (dirty && product?.status === 'draft') actions.autoSave();
}, [dirty, actions, product?.status]);
```

Rationale comment: the approved→draft revert is promised to the user as an explicit Save action (banner at :524); auto-save must not perform it (Review Focus #1).

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run resources/client/dashboard/digital-products/product-creation-autosave.dom.test.tsx`
Expected: PASS (3/3).

- [ ] **Step 6: Full frontend gate**

Run: `npx vitest run resources/client/dashboard/digital-products/ resources/client/dashboard/courses/ && npx tsc --noEmit && npx oxlint resources/client/dashboard/digital-products/`
Expected: all green (201+ tests; known parallel-load flake in `digital-product-form-page.hydrate.dom.test.tsx` → rerun that file standalone to classify if it fails).

- [ ] **Step 7: Live verification (GET-only)**

`npm run build`; on `https://linket.ddev.site/dashboard/items/1/edit` with a canned `status:'draft'` product fulfilled through the `pageWithIdentity` guard: type in Title, wait 2s, count `PUT /api/v1/items/1/draft` requests (network log) → exactly 1 with the typed title; repeat with `status:'approved'` → 0 PUTs. Zero writes beyond the autosave PUT itself — **skip this step if a write-guard is required; unit tests already pin the contract.**

- [ ] **Step 8: Commit**

```bash
git add resources/client/dashboard/digital-products/product-creation-context.tsx resources/client/dashboard/digital-products/digital-product-form-page.tsx resources/client/dashboard/digital-products/product-creation-autosave.dom.test.tsx
git commit -m "fix(product-create): auto-save sends current state, cancelled on unmount, draft-status only"
```

---

### Task 3: Menu dead-links migration (`/dashboard/my-products` → `/dashboard/items`)

**Files:**
- Create: `database/migrations/2026_10_10_000001_fix_items_menu_actions.php` (mirror the JSON-update pattern of `2026_08_16_000001_rename_digital_products_menu_label.php`)
- Test: `tests/Feature/ItemsMenuActionMigrationTest.php` (create; if `rename_digital_products_menu_label` has a test, mirror it — check first with `ls tests/Feature | grep -i menu`)

**Interfaces:**
- Consumes: `custom_menus` rows (seeded by `CreateDefaultMenusSeeder`, format established in `database/migrations/2026_08_08_215329_refactor_dashboard_menus_for_linket.php:73,109`: `['type' => 'route', 'label' => ..., 'action' => '/dashboard/my-products', ...]`).
- Produces: zero rows anywhere in `custom_menus` whose serialized payload contains `/dashboard/my-products` (desktop `dashboard-primary`, mobile `dashboard-mobile`, and any user-created menus).

- [ ] **Step 1: Write the failing test**

```php
test('no menu action points at the removed my-products route after migration', function () {
    // run the new migration's update logic (or migrate on a seeded DB)
    $this->assertDatabaseHasNoJson('/dashboard/my-products'); // or raw: DB::table('custom_menus')->where('action', 'like', '%my-products%')->count() === 0
});
// Plus: an '/dashboard/items' action EXISTS for both desktop and mobile menus after seeding.
```

- [ ] **Step 2: Run test to verify it fails**

Run: `ddev ssh && php artisan test --filter=ItemsMenuActionMigrationTest`
Expected: FAIL — rows still carry `/dashboard/my-products` (count > 0).

- [ ] **Step 3: Implement the migration**

Update **all** menu rows (desktop, mobile, custom): replace the `action` value `/dashboard/my-products` with `/dashboard/items`, using the exact row-shape handling of the 2026_08_16 label-rename migration (same table, same JSON/`action` column mechanics — read it first and copy its query structure; `down()` reverses the mapping).

- [ ] **Step 4: Run test to verify it passes**

Run: `ddev ssh && php artisan test --filter=ItemsMenuActionMigrationTest`
Expected: PASS.

- [ ] **Step 5: Confirm seeded state too**

Run: `ddev ssh && php artisan migrate:fresh --seed` **(dev DB only — confirm with user first; it wipes dev data, currently 0 rows everywhere)** then the test again.
Expected: PASS — seeder output itself contains no `my-products` (if `CreateDefaultMenusSeeder` still emits it, fix the seeder data in the same commit and re-pin the test).

- [ ] **Step 6: Commit**

```bash
git add database/migrations/2026_10_10_000001_fix_items_menu_actions.php tests/Feature/ItemsMenuActionMigrationTest.php
git commit -m "fix(menus): point dashboard desktop/mobile menus at /dashboard/items"
```

---

### Task 4: Heading hierarchy — section headings become h2 under the page h1

**Files:**
- Modify: `common/foundation/resources/client/shadcn/accordion/accordion.tsx` **only if** a level pass-through prop is needed; prefer usage-site
- Modify: `resources/client/dashboard/digital-products/product-form-section.tsx:38` (Accordion.Trigger's `AccordionPrimitive.Header` wrapper — heading element originates there)
- Test: `resources/client/dashboard/digital-products/product-creation-a11y.dom.test.tsx` (extend)

**Interfaces:**
- Consumes: `AccordionPrimitive.Header` (Base UI) — inspect its prop types first (`grep -rn "Header" node_modules/@base-ui-components/react/accordion*` or the local .d.ts) for the level/element API (`level` prop or `render`).
- Produces: on both `/dashboard/items/:id/edit` and `/dashboard/items/new/course`, the DOM order is `h1` (page) → `h2` per section trigger; no `h3` is the first heading after `h1`.

- [ ] **Step 1: Inspect the Header API (checkable result)**

Run: locate Base UI's `Accordion.Header` typings and report whether it accepts `level`/`render` (record the exact prop name in the report).
Expected: a concrete prop name; if none exists, plan fallback = usage-site wrapper `<h2>` around the Trigger (update this plan's Step 3 accordingly and note it).

- [ ] **Step 2: Write the failing test**

```ts
test('section triggers are h2 under the page h1', () => {
  // render course page + edit page section list
  // expect(screen.getAllByRole('heading', {level: 1})).toHaveLength(1);
  // expect(screen.getAllByRole('heading', {level: 2}).length).toBeGreaterThan(0);
  // expect(screen.queryAllByRole('heading', {level: 3})).toHaveLength(0);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run resources/client/dashboard/digital-products/product-creation-a11y.dom.test.tsx`
Expected: FAIL (triggers currently render h3 — critique2-A evidence: "headings start h3").

- [ ] **Step 4: Implement level=2 at the usage site**

Apply the Step-1 prop to the Header inside `AccordionPrimitive.Header` usage for **both** pages' section components (product-form-section.tsx is shared by course + edit pages — one change may cover both; verify by reading its imports in `create-course-page.tsx`).

- [ ] **Step 5: Run test + full gate**

Run: `npx vitest run resources/client/dashboard/digital-products/ resources/client/dashboard/courses/ && npx tsc --noEmit && npx oxlint resources/client/dashboard/digital-products/ resources/client/dashboard/courses/`
Expected: green (R07/R13 assertions in the same file must still pass — heading change must not touch nav/progress semantics).

- [ ] **Step 6: Commit**

```bash
git add common/foundation/resources/client/shadcn/accordion/accordion.tsx resources/client/dashboard/digital-products/product-form-section.tsx resources/client/dashboard/digital-products/product-creation-a11y.dom.test.tsx
git commit -m "fix(a11y): product-flow section headings are h2 under the page h1"
```

---

### Task 5: Page-shell progress bar spans the full header (not the text column)

**Files:**
- Modify: `resources/client/dashboard/digital-products/product-type-selection-page.tsx:53-55` (the `<div className="mt-3"><WizardStepDots/></div>` sits inside the `min-w-0` text column per final-review minor)
- Test: `resources/client/dashboard/digital-products/product-creation-a11y.dom.test.tsx` (extend — bar position assertion)

**Interfaces:**
- Consumes: `WizardStepDots` (renders `ProductFormProgress` + sr-only nav, T5/P2).
- Produces: in page-shell mode the progress bar is a sibling AFTER the whole header row (icon + text block), so its bottom rule aligns with the card column below.

- [ ] **Step 1: Write the failing test**

```ts
test('page-shell progress bar is outside the header text column', () => {
  // render page-shell step: the [aria progressbar] element must NOT be a descendant of
  // the header text block that contains the h2 meta title (assert via closest() or structure)
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run resources/client/dashboard/digital-products/product-creation-a11y.dom.test.tsx -t 'outside the header'`
Expected: FAIL (currently nested at :53-55).

- [ ] **Step 3: Move the block**

Move `<div className="mt-3"><WizardStepDots wizard={wizard} /></div>` out of the `min-w-0` text column to directly after the header row `div` (keep spacing on the 4px grid: `mt-4` at the new level); dialog layout must not change (the dialog renders `WizardStepDots` separately in `create-product-dialog.tsx:80` — do not touch it).

- [ ] **Step 4: Run test + gate**

Run: `npx vitest run resources/client/dashboard/digital-products/ && npx tsc --noEmit && npx oxlint resources/client/dashboard/digital-products/`
Expected: green.

- [ ] **Step 5: Commit**

```bash
git add resources/client/dashboard/digital-products/product-type-selection-page.tsx resources/client/dashboard/digital-products/product-creation-a11y.dom.test.tsx
git commit -m "fix(product-create): page-shell progress rule spans the content column"
```

---

### Task 6: Flatten nested muted footers on sibling dialogs

**Files:**
- Modify: `resources/client/dashboard/links/dialogs/create-link-dialog.tsx:98`
- Modify: `resources/client/dashboard/links/dialogs/create-multiple-links-dialog.tsx:132`
- Modify: `resources/client/dashboard/qr-codes/create-qr-code-dialog.tsx:82`
- Modify: `resources/client/dashboard/stores/store-editor/biolink-settings-dialog.tsx:93`
- Modify: `resources/client/dashboard/stores/store-editor/content/links/create-biolink-link-dialog.tsx:140`
- Modify: `resources/client/dashboard/stores/store-editor/content/links/update-biolink-link-dialog.tsx:148`
- Modify: `resources/client/admin/digital-products/admin-payment-activity-page.tsx:833`
- Test: existing per-dialog dom tests where present (locate with `grep -l "create-link-dialog" resources/client/**/*.test.tsx`); otherwise a single new source-string pin file `resources/client/dashboard/dialog-footer-style.test.ts` asserting none of the seven files contains `Dialog.Footer variant="muted"`.

**Interfaces:**
- Consumes: the T7/P2 precedent — `create-product-dialog.tsx` footer went from `variant="muted"` to default (`bg-muted/50 border-t` strip removed) with spacing verified via twMerge (p2-report item 6a: caller `py-4` + component base `-mx-6 -mb-6 px-6 pb-6` ⇒ pt-4/pb-4, unchanged).
- Produces: uniform flat footers; no spacing regressions.

- [ ] **Step 1: Write the failing pin**

Create/extend the pin test asserting the seven files have no `Dialog.Footer variant="muted"` (this REDs immediately — proves the pin bites).

- [ ] **Step 2: Run pin to verify it fails**

Run: `npx vitest run <pin file>`
Expected: FAIL (7 matches exist).

- [ ] **Step 3: Remove `variant="muted"` in all seven files**

Delete only the `variant="muted"` prop; keep `className="py-4 sm:justify-between"` untouched. For each dialog, check its `Dialog.Footer` has no spacing relying on muted's `pt-6` (if any dialog's footer lacks a caller `py-*` class, add the same `py-4` the product dialog uses and note it in the report).

- [ ] **Step 4: Run pin + gates**

Run: `npx vitest run <pin file> && npx vitest run resources/client/dashboard/links/ resources/client/dashboard/qr-codes/ resources/client/dashboard/stores/ && npx tsc --noEmit && npx oxlint resources/client/dashboard/`
Expected: green.

- [ ] **Step 5: Commit**

```bash
git add -A resources/client/dashboard/links resources/client/dashboard/qr-codes resources/client/dashboard/stores resources/client/admin/digital-products/admin-payment-activity-page.tsx
git commit -m "fix(dialogs): flat footers across link/QR/biolink/admin dialogs (no nested cards)"
```

---

### Task 7: Translation catalog — remove provably-dead keys

**Files:**
- Modify: `resources/client-translations.json` (deletions ONLY here — this task is the sanctioned exception to additive-only)
- Test: verification steps below (no test file; extract idempotency is the pin)

**Interfaces:**
- Consumes: `npm run extract` (harvests `<Trans message>`/`trans({message})` literals).
- Produces: catalog with zero keys unreferenced by source; extract reports "already up to date".

- [ ] **Step 1: Identify candidates**

Run: `npm run extract && node -e <script>` (write inline) that, for every catalog key, greps the raw key string in `resources/` + `common/foundation/resources/` source (`.tsx/.ts`, excluding `client-translations.json` and tests asserting absence like `product-creation-a11y.dom.test.tsx:156`). Record the candidate list — expected ≥2, including `":completed of :total steps complete"` (P2 review Minor 1) and any T7-era superseded progress string; the script output IS the list (do not trust this plan's examples).

- [ ] **Step 2: Manual review of each candidate (checkable)**

For each candidate: confirm zero references **outside** test files asserting *absence*, and no dynamic construction (`t(someVar)`, template literals containing the key's interpolation holes `:completed`/`:total`). Discard from the list anything with a live reference.

- [ ] **Step 3: Remove candidates and re-extract**

Delete the reviewed keys from `resources/client-translations.json`; run `npm run extract`.
Expected: output reports **already up to date / 0 new keys** — if extract re-adds a key, it has a live source reference: restore it and drop it from the list.

- [ ] **Step 4: Full gate**

Run: `npx vitest run resources/client/ tests/js/ 2>&1 | tail -5 && npx tsc --noEmit && python3 -c "import json;json.load(open('resources/client-translations.json'))"`
Expected: tests green (known pre-existing failures only: `tests/js/blog-admin-queries.test.ts` — other stream's missing module; hydrate/store-editor parallel-load flakes rerun standalone), JSON valid.

- [ ] **Step 5: Commit**

```bash
git add resources/client-translations.json
git commit -m "chore(i18n): remove dead catalog keys superseded by the product-flow pass"
```

---

### Task 8: Environment runbook — seed `css_themes` so `--be-*` tokens render (ops, not code)

**Files:** none (database only). **This writes to the dev DB — execute only with explicit user confirmation.**

- [ ] **Step 1: Confirm with the user** that seeding the ddev dev DB is OK (currently 0 rows in `css_themes`; a `migrate:fresh --seed` also wipes other dev data — prefer the targeted seeder).

- [ ] **Step 2: Run the targeted seeder**

Run: `ddev ssh && php artisan db:seed --class='Common\Database\Seeders\CssThemesTableSeeder'`
Expected: seeded row(s); if the class namespace differs, resolve with `grep -rn "class CssThemesTableSeeder" common/ database/`.

- [ ] **Step 3: Verify tokens render (GET-only)**

Run: `curl -sk https://linket.ddev.site/ | grep -c -- '--be-'`
Expected: > 0 (previously 0 → all color/contrast audit findings were env-tagged; re-checking even one flagged surface, e.g. the avatar contrast from critique3-B, validates the token pipeline).

- [ ] **Step 4: Record in the ledger** that color findings tagged `[env]` in `/home/nate/audits/product-flow/impeccable/*.md` are now re-verifiable (no code change).

---

### Task 9 (optional, P3): TSX detector supplement script

**Files:**
- Create: `scripts/check-tsx-anti-patterns.mjs` (new; repo `scripts/` dir if present — check, else `.opencode/` tooling dir)
- Docs: one paragraph in the script header + a note appended to `/home/nate/audits/product-flow/impeccable/LEDGER.md`

**Context:** `impeccable detect`'s rules live in a compiled binary (`.opencode/skills/impeccable/scripts/bin/linux-x64/impeccable`) — not patchable. Its static TSX pass is style-attribute-only (critique1/2/3-B evidence). This task adds a small, honest supplement; it does NOT replace the browser pass.

- [ ] **Step 1: Write the script** covering three rules where regex is defensible: (a) `style={{...}}` with raw hex colors in `.tsx`; (b) physical directionals `className="... mr-|ml-|pl-|pr-` outside allowed legacy paths; (c) `Dialog.Footer variant="muted"` (regression pin for Task 6). Exit 2 on findings, 0 clean — mirroring the impeccable CLI contract.

- [ ] **Step 2: Run against `resources/client`**

Run: `node scripts/check-tsx-anti-patterns.mjs`
Expected: 0 findings (post-Tasks 1-7); if findings, fix or document each as accepted.

- [ ] **Step 3: Commit**

```bash
git add scripts/check-tsx-anti-patterns.mjs
git commit -m "chore(tooling): static TSX anti-pattern supplement for impeccable detect"
```

---

## Execution order & splitting note

Tasks 1–2 are one full-stack unit (auto-save) and must run in order (Task 2's live check needs Task 1's route). Task 3 is independent. Tasks 4–6 are independent frontend polish (can be parallelized across separate sessions but are written to be run sequentially). Tasks 7–9 are hygiene, lowest priority. If scope must shrink, the cut line is after Task 6: Tasks 7–9 ship no user-visible behavior.

## Explicitly out of scope (decided, not forgotten)

- **Mobile bottom-nav label clipping** (`mobile-bottom-navbar.tsx`): renders a DB-driven custom menu (`useCustomMenu('dashboard-mobile')`) — the clipping is app-shell menu-item typography shared by every dashboard page, not product-flow code. Its dead-link half IS covered by Task 3; the truncation styling belongs to a separate app-shell pass (same bucket as the global `layout-transition`/avatar-contrast findings the detector flagged).
- **Runtime geometry tests** for the SectionTitle/breadcrumb fix: jsdom cannot measure layout. Live before/after measurements remain the evidence of record (`p2-report.md` item 7, `finalfix-report.md` item 1); source-regex pins stay as regression guards only (P2 review Minor 2).
