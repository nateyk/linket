# Creator Services Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a separate creator-services area to Linket: dashboard CRUD for service listings with packages and FAQs, public `/{store}/services` pages, direct contact buttons, and quote inquiries — with no payments, orders, ratings, or reviews.

**Architecture:** New `App\CreatorServices` module follows the existing `App\Storefront` module patterns. A service belongs to one storefront (`store_id`), has child packages/FAQs/gallery rows, and receives inquiries. The public side mirrors the digital-product web pattern: Laravel returns bootstrap loader data, and React renders `servicesPage` / `servicePage` through the existing wildcard renderer. The dashboard uses the existing `dashboard-routes.tsx` and menu-settings migration pattern.

**Tech Stack:** Laravel 12 / PHP 8.4, Eloquent, Pest/PHPUnit feature tests, React 19 + react-router, TanStack Query via `apiClient`, shadcn components, Tailwind 4 tokens, lucide icons, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-18-creator-services-design.md`

## Global Constraints

- All visible copy uses `<Trans message="..." />` or `trans(message(...))`.
- Components come from `common/foundation/resources/client/shadcn` first, then `ui`; icons from lucide.
- Styling uses design tokens, never raw gray values.
- No payment, order, checkout, commission, rating, star, or review code for services.
- Backend ownership is enforced with `workspace_id` + `user_id`, matching `DigitalProductsController`.
- Tests run through DDEV: `ddev exec php artisan test --compact --filter=...`.
- Frontend tests run through `npm run test -- <file>`; lint with `npm run lint`.
- The store table is `biolinks` unless `config('stores.table_rename_done')` is true; migrations must resolve it at runtime.

## Review Focus

- Inquiry endpoint abuse: a missing throttle, unvalidated package ownership, or a draft service being inquiry-able would let anyone spam or reach unpublished work. Test each.
- Cross-tenant leakage: a creator must never list, read, update, or delete another creator's service or inquiry. Test every endpoint with a second creator.
- Public visibility: only published services of the requested store appear; draft/other-store services 404. Test list and detail.
- Nested package sync: removing a package must null existing inquiry package links, not corrupt inquiries. Test update with removed package.
- Empty states: creator without a storefront, service without packages, and package without a price must still render and not crash. Test the backend defaults and the helper functions.

---

### Task 1: Schema, models, and factories

**Files:**
- Create: `database/migrations/2026_10_18_130000_create_creator_service_tables.php`
- Create: `app/CreatorServices/Models/CreatorService.php`
- Create: `app/CreatorServices/Models/ServiceImage.php`
- Create: `app/CreatorServices/Models/ServicePackage.php`
- Create: `app/CreatorServices/Models/ServiceFaq.php`
- Create: `app/CreatorServices/Models/ServiceInquiry.php`
- Create: `database/factories/CreatorServiceFactory.php`
- Test: `tests/Feature/CreatorServiceModelTest.php`

**Interfaces:**
- Produces:
  - `CreatorService` with `store()`, `creator()`, `cover()`, `images()`, `packages()`, `faqs()`, `inquiries()`, `scopePublished()`, `publicUrl(): string`.
  - `ServicePackage` with `features` cast to `array`, `price_cents` int|null.
  - `ServiceInquiry` with `service()`, `package()`, `read_at` datetime|null.

- [ ] **Step 1: Write the failing model test**

Create `tests/Feature/CreatorServiceModelTest.php` with:
```php
public function test_service_exposes_children_and_public_url(): void
{
    [$creator, $workspace, $store] = $this->context();
    $service = CreatorService::query()->create([
        'workspace_id' => $workspace->id, 'user_id' => $creator->id,
        'store_id' => $store->id, 'title' => 'Logo design',
        'slug' => 'logo-design', 'status' => 'published', 'currency' => 'ETB',
    ]);
    ServicePackage::query()->create([
        'creator_service_id' => $service->id, 'name' => 'Starter',
        'price_cents' => 29900, 'currency' => 'ETB', 'features' => ['Logo'],
        'position' => 0,
    ]);
    ServiceFaq::query()->create([
        'creator_service_id' => $service->id, 'question' => 'How long?',
        'answer' => 'Five days', 'position' => 0,
    ]);

    $this->assertSame('Starter', $service->packages()->first()->name);
    $this->assertSame(['Logo'], $service->packages()->first()->features);
    $this->assertSame('How long?', $service->faqs()->first()->question);
    $this->assertStringEndsWith('/services/logo-design', $service->publicUrl());
    $this->assertCount(1, CreatorService::query()->published()->get());
}
```

`context()` creates a user with `forceCreate`, a personal workspace via `CreateWorkspace`, and a `Biolink` store with a random `back_half`.

- [ ] **Step 2: Run to verify it fails**

Run: `ddev exec php artisan test --compact --filter=CreatorServiceModelTest`
Expected: FAIL — class `App\CreatorServices\Models\CreatorService` not found.

- [ ] **Step 3: Create the migration**

Create tables exactly per the spec. Resolve the store table:
```php
$storeTable = (config('stores.table_rename_done') || config('store.table_rename_done')) ? 'stores' : 'biolinks';
```
`creator_services`: foreign workspace cascade, `unsignedInteger('user_id')` + FK users cascade, `foreignId('store_id')->constrained($storeTable)->cascadeOnDelete()`, `title` 160, `slug` 180 unique, `short_description` 240 nullable, `description` text nullable, `category` 80 nullable, `skills` json nullable, `cover_file_entry_id` nullable FK file_entries nullOnDelete, `video_url`/`live_demo_url` 500 nullable, `contact_channels` json nullable, `status` 20 default draft indexed, timestamps, softDeletes, indexes on workspace/user/store/status. Children per spec with cascade deletes; packages/inquiries use `nullOnDelete` for the nullable package link. Add `currency` to services (12 chars, default `ETB`).

- [ ] **Step 4: Create models and factory**

Models in `app/CreatorServices/Models/`; `protected $guarded = []`; casts:
- `CreatorService`: `skills => array`, `contact_channels => array`.
- `ServicePackage`: `price_cents => integer`, `delivery_days => integer`, `revisions => integer`, `features => array`.
- `ServiceInquiry`: `read_at => datetime`.

`CreatorService::publicUrl()` returns `rtrim($this->store->short_url, '/').'/services/'.$this->slug`. `scopePublished` filters `status = published`.

Factory `Database\Factories\CreatorServiceFactory` creates a workspace, store, and user; states `published()` and `forStore(Store $store)`. `CreatorService` defines `newFactory(): CreatorServiceFactory`.

- [ ] **Step 5: Run migration and test**

Run: `ddev exec php artisan migrate --no-interaction`
Run: `ddev exec php artisan test --compact --filter=CreatorServiceModelTest`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add database/migrations app/CreatorServices database/factories tests/Feature/CreatorServiceModelTest.php
git commit -m "feat(services): add creator service schema and models"
```

---

### Task 2: Creator service CRUD API

**Files:**
- Create: `app/CreatorServices/Actions/CrupdateCreatorService.php`
- Create: `app/CreatorServices/Controllers/CreatorServicesController.php`
- Create: `app/CreatorServices/Resources/CreatorServiceResource.php`
- Modify: `common/foundation/routes/api.php` (imports + routes after the `items` resource block)
- Test: `tests/Feature/CreatorServicesApiTest.php`

**Interfaces:**
- Consumes: models from Task 1, `App\Storefront\Actions\SanitizeProductDescription`.
- Produces:
  - `CrupdateCreatorService::execute(array $data, User $creator, ?CreatorService $service = null): CreatorService`.
  - Routes: `GET/POST /api/v1/services`, `GET/PUT/DELETE /api/v1/services/{service}`.
  - `CreatorServiceResource` shape:
    `id, title, slug, status, category, skills, short_description, description, video_url, live_demo_url, contact_channels, cover:{id,url}|null, gallery:[{id,url}], packages:[{id,name,description,price_cents,currency,delivery_days,revisions,features,position}], faqs:[{id,question,answer,position}], store:{id,name,short_url}, inquiries_count, new_inquiries_count, public_url, created_at, updated_at`.

- [ ] **Step 1: Write the failing API test**

`CreatorServicesApiTest` covers:
- `test_creator_can_create_service_with_packages_faqs_and_gallery` — POST with store, 2 packages, 1 FAQ, 2 gallery file ids, contact channels; assert 201, nested arrays, slug `logo-design`, status `draft`.
- `test_index_is_scoped_to_the_active_workspace_and_user` — creator A sees own, creator B's service is absent.
- `test_update_syncs_packages_and_removes_deleted_packages` — PUT with one existing package, one new; assert old removed package deleted and inquiry package id nulled (create inquiry first).
- `test_other_creator_cannot_view_update_or_delete` — 404/403 for a second creator.
- `test_create_rejects_store_from_another_workspace` — 422.
- `test_service_can_be_published_and_exposes_public_url` — status `published`, URL suffix.

Use `DatabaseTransactions`, `ActiveWorkspace::clearCache()` in tearDown, `stateful()` with `Referer` header.

- [ ] **Step 2: Run to verify it fails**

Run: `ddev exec php artisan test --compact --filter=CreatorServicesApiTest`
Expected: FAIL — 404 (routes missing).

- [ ] **Step 3: Add routes**

In `common/foundation/routes/api.php`, import the controller and add inside the authenticated `v1` block near the `items` routes:
```php
Route::apiResource('services', CreatorServicesController::class)->parameters(['services' => 'service']);
```
Place static inquiry routes (Task 3) before this resource later.

- [ ] **Step 4: Implement action, controller, resource**

Validation rules:
```php
'title' => 'required|string|max:160',
'store_id' => 'required|integer',
'short_description' => 'nullable|string|max:240',
'description' => 'nullable|string|max:50000',
'category' => 'nullable|string|max:80',
'skills' => 'nullable|array|max:20',
'skills.*' => 'string|max:40',
'cover_file_entry_id' => 'nullable|integer|exists:file_entries,id',
'gallery_file_entry_ids' => 'nullable|array|max:8',
'gallery_file_entry_ids.*' => 'integer|distinct|exists:file_entries,id',
'video_url' => 'nullable|url|max:500',
'live_demo_url' => 'nullable|url|max:500',
'status' => 'nullable|in:draft,published',
'contact_channels' => 'nullable|array|max:6',
'contact_channels.*.type' => 'required|in:whatsapp,telegram,email,phone,link',
'contact_channels.*.label' => 'nullable|string|max:60',
'contact_channels.*.value' => 'required|string|max:300',
'packages' => 'nullable|array|max:6',
'packages.*.id' => 'nullable|integer',
'packages.*.name' => 'required|string|max:80',
'packages.*.description' => 'nullable|string|max:3000',
'packages.*.price_cents' => 'nullable|integer|min:0|max:1000000000',
'packages.*.delivery_days' => 'nullable|integer|min:0|max:365',
'packages.*.revisions' => 'nullable|integer|min:0|max:100',
'packages.*.features' => 'nullable|array|max:20',
'packages.*.features.*' => 'string|max:200',
'faqs' => 'nullable|array|max:20',
'faqs.*.question' => 'required|string|max:240',
'faqs.*.answer' => 'required|string|max:3000',
```

Store ownership check: `DB::table((new Store)->getTable())->where('id', $data['store_id'])->where('workspace_id', $workspace->id)->exists()`.

`execute()`:
- `$workspaceId = ActiveWorkspace::get()->id`.
- Sanitize description with `SanitizeProductDescription`.
- On create: slug from `Str::slug(title)` (`service` fallback), suffix `-2`, `-3`, ... until unique including trashed.
- On update: never change slug.
- `DB::transaction`: create/update parent; sync packages by id (`update` existing, `create` new, `delete` missing), delete+recreate FAQs and images.
- Set `position` from array index for packages/faqs/images.
- Normalize contact channels: trim, drop empty values, for `email` require `filter_var(..., FILTER_VALIDATE_EMAIL)`, for `link` require `filter_var(..., FILTER_VALIDATE_URL)`, for `whatsapp`/`phone` strip non-digits and require at least 6 digits, for `telegram` strip leading `@`.
- Return `$service->fresh()->load(['store','cover','images.file','packages','faqs'])`.

Controller:
- `index`: `CreatorService::where('workspace_id', ActiveWorkspace::get()->id)->where('user_id', $request->user()->id)->with([...])->withCount(['inquiries','inquiries as new_inquiries_count' => fn($q) => $q->where('status','new')])->latest()->paginate(min(max($request->integer('per_page', 50),1),100))`.
- `show/update/destroy`: `assertOwner()` comparing workspace and user, `abort(404)` otherwise.
- `store` returns 201.

- [ ] **Step 5: Run tests**

Run: `ddev exec php artisan test --compact --filter=CreatorServicesApiTest`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/CreatorServices common/foundation/routes/api.php tests/Feature/CreatorServicesApiTest.php
git commit -m "feat(services): add creator service CRUD API"
```

---

### Task 3: Inquiries API and notification

**Files:**
- Create: `app/CreatorServices/Actions/CreateServiceInquiry.php`
- Create: `app/CreatorServices/Controllers/ServiceInquiriesController.php`
- Create: `app/CreatorServices/Notifications/NewServiceInquiryNotification.php`
- Create: `app/CreatorServices/Resources/ServiceInquiryResource.php`
- Modify: `common/foundation/routes/api.php`
- Test: `tests/Feature/ServiceInquiriesTest.php`

**Interfaces:**
- Consumes: `CreatorService`, `ServiceInquiry`, `CreatorServiceResource`.
- Produces:
  - `CreateServiceInquiry::execute(CreatorService $service, array $data): ServiceInquiry`.
  - Creator routes: `GET /api/v1/services/inquiries`, `GET/PATCH/DELETE /api/v1/services/inquiries/{serviceInquiry}`.
  - Notification constructor `(int $inquiryId)`; mail + database channels.

- [ ] **Step 1: Write the failing test**

`ServiceInquiriesTest` covers:
- `test_public_visitor_can_send_inquiry_for_a_package` — POST public endpoint; assert 201, DB row, status `new`, package id, `Notification::assertSentTo($creator, NewServiceInquiryNotification::class, channels mail+database)`.
- `test_inquiry_requires_valid_contact_details` — missing name/email/message => 422; invalid email => 422.
- `test_package_must_belong_to_the_service` — package from another service => 422.
- `test_draft_service_cannot_receive_inquiries` — 404.
- `test_creator_lists_only_own_inquiries_and_filters_by_service` — second creator's inquiry absent.
- `test_opening_an_inquiry_marks_it_read` — `read_at` not null after GET.
- `test_creator_updates_status_and_deletes` — status `contacted`, then DELETE, row gone.

Use `Notification::fake()`, `DatabaseTransactions`.

- [ ] **Step 2: Run to verify it fails**

Run: `ddev exec php artisan test --compact --filter=ServiceInquiriesTest`
Expected: FAIL — route/class missing.

- [ ] **Step 3: Add creator inquiry routes**

Add before `Route::apiResource('services', ...)`:
```php
Route::get('services/inquiries', [ServiceInquiriesController::class, 'index']);
Route::get('services/inquiries/{serviceInquiry}', [ServiceInquiriesController::class, 'show']);
Route::patch('services/inquiries/{serviceInquiry}', [ServiceInquiriesController::class, 'update']);
Route::delete('services/inquiries/{serviceInquiry}', [ServiceInquiriesController::class, 'destroy']);
```

- [ ] **Step 4: Implement notification**

`NewServiceInquiryNotification implements ShouldQueue`; constructor `(public int $inquiryId)`, queue `default`; `via()` returns `['mail','database']`; `viaQueues()` mail=>mail, database=>default; `shouldSend()` checks inquiry exists. Mail subject `New inquiry for ":service"`, greeting, lines for name/email/phone/package/message, action `View inquiry` to `/dashboard/services/inquiries`. Database payload mirrors lines with escaped content and mainAction.

- [ ] **Step 5: Implement action and controller**

`CreateServiceInquiry::execute()`:
- `$inquiry = $service->inquiries()->create([...])` with name/email/phone/message and package id.
- `$inquiry->service->creator->notify(new NewServiceInquiryNotification($inquiry->id));`
- Return inquiry.

Controller:
- `index`: query `ServiceInquiry::whereHas('service', fn($q) => $q->where('workspace_id', ActiveWorkspace::get()->id)->where('user_id', auth()->id()))`, filters `service_id` and `status`, `with(['service','package'])` (service uses `withTrashed()`), latest, paginate 30.
- `show`: same owner scope; set `read_at` if null; return resource.
- `update`: validate `status` in `new,contacted,won,lost,archived`; update.
- `destroy`: delete.
- Ownership failure => 404.

- [ ] **Step 6: Run tests**

Run: `ddev exec php artisan test --compact --filter=ServiceInquiriesTest`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/CreatorServices common/foundation/routes/api.php tests/Feature/ServiceInquiriesTest.php
git commit -m "feat(services): add inquiry inbox and creator notifications"
```

---

### Task 4: Public service API and public web pages

**Files:**
- Create: `app/CreatorServices/PublicCreatorServices.php`
- Create: `app/CreatorServices/Controllers/PublicServicesController.php`
- Create: `app/CreatorServices/Controllers/PublicServicesPageController.php`
- Create: `app/CreatorServices/Controllers/PublicServicePageController.php`
- Create: `app/CreatorServices/Resources/PublicServiceResource.php`
- Create: `app/CreatorServices/Resources/PublicServiceDetailResource.php`
- Modify: `common/foundation/routes/api.php` (public routes near existing public storefront routes)
- Modify: `routes/web.php` (before fallback)
- Test: `tests/Feature/PublicServicesTest.php`

**Interfaces:**
- Consumes: Public services query, `BiolinkResource`, `RendersClientSideApp`, `LinkeablePublicPolicy`.
- Produces:
  - `PublicCreatorServices::findStore(string $backHalf): Biolink|Store`
  - `PublicCreatorServices::services(Biolink|Store $store)` (published only)
  - `PublicCreatorServices::service(Biolink|Store $store, string $slug): CreatorService`
  - Web loaders `servicesPage` and `servicePage`.
  - `PublicServiceResource` list shape: `id, slug, title, category, short_description, skills, cover:{url}|null, packages_count, starting_price_cents, currency, public_url`.
  - Detail shape: list fields + `description, gallery:[{id,url}], video_url, live_demo_url, packages, faqs, contact_channels`.

- [ ] **Step 1: Write the failing test**

`PublicServicesTest` covers:
- `test_public_lists_only_published_services_for_the_requested_store` — two published for store A, one for store B, one draft; assert only A's two.
- `test_public_detail_includes_packages_faqs_and_contact_channels` — assert nested data and `inquiry_endpoint`.
- `test_draft_service_detail_is_not_visible` — 404.
- `test_public_services_web_page_returns_ok` — `GET /{backHalf}/services` => 200 and bootstrap contains `servicesPage`.
- `test_public_service_web_page_returns_ok_and_draft_404` — detail 200/404.
- `test_creator_service_count_is_exposed_on_the_storefront_payload` — `$store->loadContent(); (new BiolinkResource($store))->resolve()['public_service_count'] === 1` (implement resource change in Task 9; this test can live in Task 9 instead).

- [ ] **Step 2: Run to verify it fails**

Run: `ddev exec php artisan test --compact --filter=PublicServicesTest`
Expected: FAIL — routes missing.

- [ ] **Step 3: Add public API routes**

At the bottom public block:
```php
Route::get('public/stores/{biolink}/services', [PublicServicesController::class, 'index']);
Route::get('public/stores/{biolink}/services/{service}', [PublicServicesController::class, 'show']);
Route::post('public/stores/{biolink}/services/{service}/inquiries', [PublicServicesController::class, 'inquiry'])
    ->middleware('throttle:10,1')
    ->withoutMiddleware([
        EnsureFrontendRequestsAreStateful::class,
        VerifyCsrfToken::class,
        VerifyApiAccessMiddleware::class,
    ]);
```

- [ ] **Step 4: Add public web routes**

Before the product routes or immediately after them in `routes/web.php`:
```php
Route::get('{storeSlug}/services', [PublicServicesPageController::class, 'show'])->name('services.public.index');
Route::get('{storeSlug}/services/{service}', [PublicServicePageController::class, 'show'])->name('services.public.show');
```

- [ ] **Step 5: Implement public query class and controllers**

`PublicCreatorServices::findStore` mirrors `PublicDigitalProducts::findBiolink` (Store first, Biolink fallback, `LinkeablePublicPolicy`). `services()` returns published services for `store_id`, eager loads `cover`, `packages`, `withCount('packages')`, order latest.

`PublicServicesController@index` returns `PublicServiceResource::collection(...)`. `@show` returns `['data' => (new PublicServiceDetailResource($service))->resolve()]`. `@inquiry` validates:
```php
'name' => 'required|string|max:120',
'email' => 'required|email|max:180',
'phone' => 'nullable|string|max:40',
'message' => 'required|string|max:5000',
'package_id' => 'nullable|integer',
```
Then verify package belongs to service; call `CreateServiceInquiry`; return 201 `['message' => __('Inquiry sent. The creator will contact you soon.')]`.

`PublicServicesPageController@show` returns:
```php
'loader' => 'servicesPage',
'pageName' => 'services',
'data' => [
  'data' => [
    'store' => (new BiolinkResource($store))->resolve(),
    'appearance' => $store->appearance?->config,
    'services' => PublicServiceResource::collection($services)->resolve(),
    'back_url' => $store->short_url,
  ],
],
```
`PublicServicePageController@show` returns `loader => 'servicePage'`, includes `service` detail, `store`, `appearance`, `inquiry_endpoint`, `back_url` (services list URL), `pageName => 'service'`.

- [ ] **Step 6: Run tests**

Run: `ddev exec php artisan test --compact --filter=PublicServicesTest`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/CreatorServices common/foundation/routes/api.php routes/web.php tests/Feature/PublicServicesTest.php
git commit -m "feat(services): expose public service pages and inquiry API"
```

---

### Task 5: Dashboard menu, routes, and service list page

**Files:**
- Create: `database/migrations/2026_10_18_130100_add_my_services_dashboard_menu.php`
- Modify: `resources/defaults/default-settings.php` (dashboard-primary + dashboard-mobile items)
- Modify: `resources/defaults/menu-editor-config.php` (available route)
- Modify: `resources/client/dashboard/dashboard-routes.tsx`
- Modify: `resources/client/dashboard/layout/sidenav/dashboard-sidebar-icons.tsx`
- Create: `resources/client/dashboard/services/services-page.tsx`
- Test: `tests/Feature/ServicesMenuTest.php`

**Interfaces:**
- Consumes: `GET /api/v1/services`, `GET /api/v1/services/inquiries`.
- Produces routes: `/dashboard/services`, `/dashboard/services/new`, `/dashboard/services/:serviceId/edit`, `/dashboard/services/inquiries`.

- [ ] **Step 1: Write the failing menu test**

`ServicesMenuTest` queries `settings` row `menus`, decodes JSON, and asserts both `dashboard-primary` and `dashboard-mobile` contain an item with `action = /dashboard/services`, label `My Services`, after `/dashboard/items`.

- [ ] **Step 2: Run to verify it fails**

Run: `ddev exec php artisan test --compact --filter=ServicesMenuTest`
Expected: FAIL.

- [ ] **Step 3: Add menu and defaults**

Migration mirrors `2026_10_13_000001_add_help_center_to_admin_sidebar.php`: insert item `{type: route, label: 'My Services', action: '/dashboard/services', id: 'creator-services-dashboard'}` after `/dashboard/items` in `dashboard-primary`; same with id `creator-services-mobile` in `dashboard-mobile`; renumber `order`; `Cache::forget('settings.public')`. Down removes both.

Also add the item to `resources/defaults/default-settings.php` for fresh installs and `/dashboard/services` to `menu-editor-config.php`.

- [ ] **Step 4: Add dashboard routes and icon**

In `dashboard-routes.tsx` after `items` routes:
```tsx
{ path: 'services', lazy: () => import('@app/dashboard/services/services-page') },
{ path: 'services/new', lazy: () => import('@app/dashboard/services/service-form-page') },
{ path: 'services/:serviceId/edit', lazy: () => import('@app/dashboard/services/service-form-page') },
{ path: 'services/inquiries', lazy: () => import('@app/dashboard/services/services-inquiries-page') },
```
Create placeholder imports in this task for form/inbox (full pages in Tasks 6/7) so the build stays green, or implement pages before adding routes. Prefer adding list route only in this task and add others with their pages.

Map `'/dashboard/services': <BriefcaseBusinessIcon />` in `dashboard-sidebar-icons.tsx`.

- [ ] **Step 5: Implement list page**

`services-page.tsx`:
- `DashboardLayout.MainSection`, header title `My Services`, buttons `Inquiries` (link) and `New service`.
- Fetch `/api/v1/services?per_page=100` with `apiClient`.
- Empty state when no services; special empty state when the response includes no store (`stores` data; fetch `/api/v1/stores` if needed) linking to `/dashboard/stores`.
- Card grid with cover, title, status badge, category, starting price (`From ETB 299` or `Request a quote`), package count, inquiry count. Dropdown actions: Edit, View (public URL), Publish/Unpublish, Delete with `AlertDialog`.
- Use `toast.positive/negative`, `Trans`, tokens.

- [ ] **Step 6: Run menu test and lint**

Run: `ddev exec php artisan test --compact --filter=ServicesMenuTest`
Run: `npm run lint -- resources/client/dashboard/services resources/client/dashboard/dashboard-routes.tsx`
Expected: PASS / no new errors.

- [ ] **Step 7: Commit**

```bash
git add database/migrations/2026_10_18_130100_add_my_services_dashboard_menu.php resources/defaults resources/client/dashboard tests/Feature/ServicesMenuTest.php
git commit -m "feat(services): add My Services dashboard menu and list page"
```

---

### Task 6: Dashboard service create/edit form

**Files:**
- Create: `resources/client/dashboard/services/service-form-state.ts`
- Create: `resources/client/dashboard/services/service-form-state.test.ts`
- Create: `resources/client/dashboard/services/service-save-error.ts`
- Create: `resources/client/dashboard/services/service-save-error.test.ts`
- Create: `resources/client/dashboard/services/service-form-page.tsx`
- Modify: `resources/client/dashboard/dashboard-routes.tsx` (form routes)

**Interfaces:**
- `emptyServiceForm(): ServiceFormState`
- `fromServiceResource(service: CreatorServicePayload): ServiceFormState`
- `toServicePayload(state: ServiceFormState): ServiceServicePayload`
- `parsePriceToCents(value: string): number | null` (re-export/use `parseEtbToCents`)
- `serviceSaveErrorMessage(reason: unknown): string`

- [ ] **Step 1: Write failing helper tests**

`service-form-state.test.ts`:
- empty form has one blank package and no FAQs; `toServicePayload` trims title, turns blank price into `null`, splits feature lines into an array, drops blank packages/FAQs, converts `12.5` to `1250`.
- hydration round-trips package ids and formatted price strings.
- blank contact channel values are dropped.

`service-save-error.test.ts`:
- Laravel 422 `{message, errors:{'packages.0.name': ['Name is required']}}` -> message and field error.
- network error -> `Unable to save service.`

- [ ] **Step 2: Run to verify they fail**

Run: `npm run test -- resources/client/dashboard/services/service-form-state.test.ts resources/client/dashboard/services/service-save-error.test.ts`
Expected: FAIL — modules missing.

- [ ] **Step 3: Implement helpers**

Types:
```ts
export type ServiceContactChannelType = 'whatsapp' | 'telegram' | 'email' | 'phone' | 'link';
export type ServiceFormPackage = {id?: number; name: string; description: string; price: string; delivery_days: string; revisions: string; features: string};
export type ServiceFormFaq = {id?: number; question: string; answer: string};
export type ServiceFormContactChannel = {type: ServiceContactChannelType; label: string; value: string};
export type ServiceFormState = {
  store_id: string; title: string; short_description: string; description: string;
  category: string; skills: string; cover_url: string; cover_file_entry_id: number | null;
  gallery: {id: number; url: string}[]; video_url: string; live_demo_url: string;
  status: 'draft' | 'published'; packages: ServiceFormPackage[]; faqs: ServiceFormFaq[];
  contact_channels: ServiceFormContactChannel[];
};
```
Use `parseEtbToCents` from `@app/dashboard/digital-products/product-create-flow`. `toServicePayload` returns `packages: [...]` with `price_cents`, `features`, ints/null, `faqs`, `contact_channels`, `gallery_file_entry_ids`, `cover_file_entry_id`, `store_id` number, `status`.

`parseServiceErrors` uses `getApiErrorMessage` and `parseApiError` to expose `FieldErrors`.

- [ ] **Step 4: Implement form page**

`service-form-page.tsx`:
- Read `:serviceId`; load `/api/v1/services/{id}` for edit, `/api/v1/stores?per_page=100` for store options.
- Sections: Basics (store select, title, short description, TipTap description reusing `TipTapEditorProvider` + `articleEditorTipTapExtensions`, category, skills via `SkillsChipsField` wrapped or a comma input), Media (`CroppedCover` + `SharedFileUploader` for gallery with `uploadType="linkImages"`, video/live demo URL), Packages repeater (name, price, delivery days, revisions, description, features textarea one-per-line, add/remove), FAQs repeater, Contact buttons repeater (type select, label, value, add/remove), Publish switch/status.
- Save button calls POST or PUT; on success toast + navigate to `/dashboard/services` (create) or stay (edit).
- Show field errors from `parseServiceErrors`, and top-level error alert.
- Delete action on edit with `AlertDialog`.
- Ensure keyboard labels and `htmlFor`/ids; use `Trans` for all copy.

- [ ] **Step 5: Add form routes**

Add the two form routes from Task 5 to `dashboard-routes.tsx`.

- [ ] **Step 6: Run frontend tests and lint**

Run: `npm run test -- resources/client/dashboard/services/service-form-state.test.ts resources/client/dashboard/services/service-save-error.test.ts`
Run: `npm run lint -- resources/client/dashboard/services`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add resources/client/dashboard/services resources/client/dashboard/dashboard-routes.tsx
git commit -m "feat(services): add service create and edit form"
```

---

### Task 7: Inquiries inbox page

**Files:**
- Create: `resources/client/dashboard/services/services-inquiries-page.tsx`
- Create: `resources/client/dashboard/services/service-inquiry-filters.ts`
- Create: `resources/client/dashboard/services/service-inquiry-filters.test.ts`
- Modify: `resources/client/dashboard/dashboard-routes.tsx` (inquiries route)

**Interfaces:**
- `buildInquiryQuery({serviceId, status, page}): string` -> `/api/v1/services/inquiries?...`
- `inquiryStatusLabel(status): string`
- `inquiryStatusTone(status): 'default' | 'secondary' | 'destructive' | 'outline'` (or a local class map).

- [ ] **Step 1: Write the failing filter test**

Assert query building omits empty values, includes `service_id`, `status`, `page`; status labels for all five statuses; unknown status falls back to `new`.

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test -- resources/client/dashboard/services/service-inquiry-filters.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement filter helpers**

- [ ] **Step 4: Implement inbox page**

- `DashboardLayout` header `Inquiries`, back link to `My Services`, service filter select (fetch services), status select.
- Fetch `/api/v1/services/inquiries` with query.
- List rows/cards: customer name, email, phone, service title, package name, relative date, status badge, unread dot when `read_at` null.
- Click opens a `Dialog`/`Sheet` with full message, contact actions (`mailto:`, `tel:`), package, date, status select, delete button. Opening calls GET detail (marks read) and refreshes list count.
- Empty state when no inquiries.
- All copy through `Trans`.

- [ ] **Step 5: Run tests and lint**

Run: `npm run test -- resources/client/dashboard/services/service-inquiry-filters.test.ts`
Run: `npm run lint -- resources/client/dashboard/services`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add resources/client/dashboard/services resources/client/dashboard/dashboard-routes.tsx
git commit -m "feat(services): add inquiry inbox"
```

---

### Task 8: Public services list page, card, and contact links

**Files:**
- Create: `resources/client/services/public/service-types.ts`
- Create: `resources/client/services/public/service-contact-links.ts`
- Create: `resources/client/services/public/service-contact-links.test.ts`
- Create: `resources/client/services/public/service-price.ts`
- Create: `resources/client/services/public/service-price.test.ts`
- Create: `resources/client/services/public/service-card.tsx`
- Create: `resources/client/services/public/public-services-page.tsx`
- Modify: `resources/client/main.tsx` (loader types)
- Modify: `resources/client/app-router.tsx` (public loader detection)
- Modify: `resources/client/short-links/linkeable-renderer.tsx` (render loaders)

**Interfaces:**
- `contactChannelHref(channel): string | null`
- `serviceStartingPrice(service): string` using `formatMoney` + translated "From"/"Request a quote"
- `PublicServicesPage({data})` with `data.store`, `data.appearance`, `data.services`, `data.back_url`.

- [ ] **Step 1: Write failing unit tests**

`service-contact-links.test.ts`:
- WhatsApp `+251 911 234 567` -> `https://wa.me/251911234567`
- Telegram `@studio` -> `https://t.me/studio`
- email -> `mailto:...`; phone -> `tel:+251...`; link https passes; `javascript:`/empty returns null.
`service-price.test.ts`:
- starting price 29900 ETB -> `From ETB 299` (use `formatMoney` output contract; assert contains `299`)
- null -> `Request a quote`.

- [ ] **Step 2: Run to verify they fail**

Run: `npm run test -- resources/client/services/public/service-contact-links.test.ts resources/client/services/public/service-price.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement types, helpers, card**

`service-types.ts` mirrors `PublicServiceResource`/`PublicServiceDetailResource`. `ServiceCard` uses `ProductCard` quiet props or a dedicated shadcn `Card`: cover image (fallback `BriefcaseBusinessIcon`), category badge, title, short description clamp, price, package count. Wrap the whole card in an `<a href={public_url}>`; avoid nested interactive elements.

- [ ] **Step 4: Implement public list page**

- Outer wrapper with `Background` and `resolveBiolinkThemeVariables` from `biolink-appearance`.
- Header: back link to `back_url`, creator avatar/name/profile title from `store.profile_config`, heading `Services`, count.
- Grid of `ServiceCard`.
- Empty state: `No services yet`.
- Responsive 1/2/3 columns.
- Use `Trans`.

- [ ] **Step 5: Wire loaders**

In `main.tsx`, add `servicesPage?: {data: PublicServicesPageData}; servicePage?: {...}` to `loaders`.
In `linkeable-renderer.tsx`, check `loaders.servicesPage` and `loaders.servicePage` before `linkeablePage`, rendering the pages.
In `app-router.tsx`, include these loaders in the "public page, do not redirect logged-in users" condition and the `linkeable-renderer` lazy branch.

- [ ] **Step 6: Run tests, lint, and typecheck**

Run: `npm run test -- resources/client/services/public/service-contact-links.test.ts resources/client/services/public/service-price.test.ts`
Run: `npm run lint -- resources/client/services resources/client/main.tsx resources/client/app-router.tsx resources/client/short-links/linkeable-renderer.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add resources/client/services resources/client/main.tsx resources/client/app-router.tsx resources/client/short-links/linkeable-renderer.tsx
git commit -m "feat(services): add public services list page"
```

---

### Task 9: Public service detail page and inquiry dialog

**Files:**
- Create: `resources/client/services/public/public-service-page.tsx`
- Create: `resources/client/services/public/service-inquiry-form.ts`
- Create: `resources/client/services/public/service-inquiry-form.test.ts`
- Create: `resources/client/services/public/service-inquiry-dialog.tsx`
- Create: `resources/client/services/public/service-gallery.tsx`
- Create: `resources/client/services/public/service-package-panel.tsx`

**Interfaces:**
- `buildInquiryPayload(form): {name,email,phone,message,package_id?}`
- `validateInquiryForm(form): Record<string,string>` (name/email/message required; email format).
- `PublicServicePage({data})`.

- [ ] **Step 1: Write failing form tests**

Assert payload trimming, empty phone -> omitted, package id included as number, and validation errors for missing name/email/message/invalid email.

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test -- resources/client/services/public/service-inquiry-form.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement form helpers and dialog**

Dialog uses `Dialog.Root`, `Field`, `Input`, `Textarea`, `Button`, `Alert`. Fields name, email, phone, message. Shows selected package. Calls `apiClient.post(data.inquiry_endpoint, payload)`. Success state replaces form with check icon and message. Reset on close. Keyboard accessible; all labels via `Trans`/`trans`.

- [ ] **Step 4: Implement detail page**

- Appearance wrapper like list page.
- Back link to `back_url`.
- Two-column desktop grid: left gallery (main image + thumbnails, state), title, category + skills badges, description HTML (`dangerouslySetInnerHTML` with already-sanitized server HTML), FAQ accordion.
- Right: package panel (tabs when 2+ packages; single card otherwise). Each package: name, price or `Request a quote`, delivery days, revisions, features list, `Request this package` button opening inquiry dialog.
- Seller card: avatar/name/title from `store.profile_config`, contact channel buttons from `service.contact_channels` using `contactChannelHref`, and `Send inquiry` button.
- No stars/reviews.
- Mobile single column; sticky CTA optional but keep simple.

- [ ] **Step 5: Run tests and lint**

Run: `npm run test -- resources/client/services/public/service-inquiry-form.test.ts`
Run: `npm run lint -- resources/client/services`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add resources/client/services
git commit -m "feat(services): add public service detail and inquiry dialog"
```

---

### Task 10: Storefront Services tab and final verification

**Files:**
- Modify: `app/Stores/Models/Store.php` (`creatorServices()` + `loadContent()` + `publicServiceCount()`)
- Modify: `app/Biolinks/Resources/BiolinkResource.php` (`public_service_count`)
- Modify: `resources/client/short-links/renderers/biolink-renderer/creator-profile-layout.tsx`
- Create: `resources/client/services/public/services-section.tsx`
- Test: `tests/Feature/StorefrontServicesTabTest.php`

**Interfaces:**
- `Store::creatorServices(): HasMany`
- `Store::publicServiceCount(): int`
- `BiolinkResource` adds `public_service_count?: int` (frontend reads it through a local intersection type).

- [ ] **Step 1: Write the failing PHP test**

Create published + draft services for a store, `loadContent()`, resolve `BiolinkResource`; assert `public_service_count === 1`. Also assert the relation only includes published. Use `DatabaseTransactions`.

- [ ] **Step 2: Run to verify it fails**

Run: `ddev exec php artisan test --compact --filter=StorefrontServicesTabTest`
Expected: FAIL — field missing.

- [ ] **Step 3: Implement backend count**

Add `creatorServices()` hasMany (`store_id`). In `loadContent()`, eager load `creatorServices` filtered to `status = published`. Add `public_service_count` to `BiolinkResource` using `when($this->relationLoaded('creatorServices'), fn() => $this->publicServiceCount())`.

- [ ] **Step 4: Implement the storefront sections**

In `creator-profile-layout.tsx`:
- `hasServices = (biolink as Biolink & {public_service_count?: number}).public_service_count > 0`.
- Mobile nav items: add `{label: trans(message('Services')), icon: BriefcaseBusinessIcon, value: 'services'}`; render section with `<ServicesSection biolink={biolink} appearance={appearance} />`; include in `showNavigation`.
- Desktop `CreatorProfileContent`: build sections array (Products, Services, About) and render `StoreFront` with tabs when 2+; default tab products, else services, else about. If only one section, render it directly.
- `ServicesSection` fetches `/api/v1/public/stores/{id}/services`, filters by `product_ids`? No — show all published, max 6, plus a `View all services` link to `${short_url}/services`. Use `ServiceCard`.
- In preview mode (`variant === 'editor'` not applicable), still fetch only when not preview? The component receives no preview flag; render the real list.

- [ ] **Step 5: Run PHP + frontend tests**

Run: `ddev exec php artisan test --compact --filter=StorefrontServicesTabTest`
Run: `npm run test -- resources/client/short-links/renderers/biolink-renderer/creator-profile-layout.dom.test.tsx`
Expected: PASS (existing fixtures lack `public_service_count`, so no services tab appears).

- [ ] **Step 6: Full verification**

Run:
```bash
npm run extract
npm run lint
npm run test
ddev exec php artisan test --compact --filter=CreatorService
ddev exec php artisan test --compact --filter=PublicServices
ddev exec php artisan test --compact --filter=ServiceInquiries
ddev exec php artisan test --compact --filter=ServicesMenu
ddev exec php artisan test --compact --filter=StorefrontServicesTab
npm run build
```
Expected: all commands exit 0. Fix any regression before committing.

- [ ] **Step 7: Commit**

```bash
git add app/Stores app/Biolinks resources/client/short-links resources/client/services tests/Feature/StorefrontServicesTabTest.php resources/client-translations.json resources/server-translations.json
git commit -m "feat(services): add Services tab to creator storefront"
```
