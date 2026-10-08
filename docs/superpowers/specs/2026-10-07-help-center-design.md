# Help Center Design Specification

**Project:** Linket
**Date:** 2026-10-07
**Status:** Approved for implementation

---

## 1. Overview

Implement a Help Center module for Linket, modeled after the MarketBob Help Center addon but built natively into Linket's modular architecture using Inertia.js + React for the public frontend and React/Inertia admin settings pages.

### 1.1 Goals

- Provide a self-service knowledge base for Linket users
- Match Linket's existing architectural patterns (Common module, Inertia + React, admin settings)
- Support categories, articles, search, article feedback (like/dislike), and related articles
- Enable admin management via Settings UI with drag-sort categories and rich article editing

### 1.2 Non-Goals

- Ticketing system integration (separate feature)
- Multi-language content (can be added later via existing localization)
- AI-powered search/answers (future enhancement)

---

## 2. Architecture

### 2.1 Module Location

```
common/foundation/src/Help/
├── Models/
│   ├── HelpCategory.php
│   └── HelpArticle.php
├── Http/Controllers/
│   ├── HelpController.php              # Public pages
│   ├── AdminHelpCategoryController.php # Admin API
│   └── AdminHelpArticleController.php  # Admin API
├── Database/Migrations/
│   ├── create_help_categories_table.php
│   └── create_help_articles_table.php
├── Scopes/
│   └── SortByIdScope.php               # Drag-sort ordering
├── Resources/
│   ├── HelpCategoryResource.php
│   └── HelpArticleResource.php
└── HelpServiceProvider.php
```

### 2.2 Data Model

#### `help_categories`
| Column | Type | Constraints |
|--------|------|-------------|
| id | bigint unsigned | PK, AI |
| name | varchar(255) | not null |
| slug | varchar(255) | unique, not null |
| views | bigint unsigned | default 0 |
| sort_id | bigint | default 0 |
| created_at | timestamp | nullable |
| updated_at | timestamp | nullable |

**Global Scope:** `SortByIdScope` — orders by `sort_id ASC`

#### `help_articles`
| Column | Type | Constraints |
|--------|------|-------------|
| id | bigint unsigned | PK, AI |
| title | varchar(255) | not null |
| slug | varchar(255) | unique, not null |
| body | longtext | not null |
| short_description | varchar(200) | not null |
| views | bigint | default 0 |
| likes | bigint | default 0 |
| dislikes | bigint | default 0 |
| help_category_id | bigint unsigned | FK → help_categories.id, cascade delete |
| created_at | timestamp | nullable |
| updated_at | timestamp | nullable |

**Relationships:**
- `HelpCategory::hasMany(HelpArticle::class, 'help_category_id')`
- `HelpArticle::belongsTo(HelpCategory::class, 'help_category_id')`

**Slug Generation:** Both models use `Cviebrock\EloquentSluggable` (already in Linket via `cocur/slugify`)

---

## 3. Public Frontend (Inertia + React)

### 3.1 Routes

| Method | URI | Controller | Name | Inertia Page |
|--------|-----|------------|------|--------------|
| GET | `/help` | `HelpController@index` | `help.index` | `help/index` |
| GET | `/help/categories/{slug}` | `HelpController@category` | `help.category` | `help/category` |
| GET | `/help/articles/{slug}` | `HelpController@article` | `help.article` | `help/article` |
| POST | `/help/articles/{slug}/react` | `HelpController@react` | `help.react` | — |

All routes use `RendersClientSideApp` trait and return Inertia responses with data loaders.

### 3.2 Data Loaders

Registered in `BootstrapData`:
- `helpIndex` — categories with 8 articles each, common categories (top 4 by views), search results
- `helpCategory` — category + paginated articles (20/page)
- `helpArticle` — article + category + related articles (random 10 from same category)

### 3.3 React Pages (Lazy-Loaded)

```
common/foundation/resources/client/help/
├── help-index-page.tsx
├── help-category-page.tsx
├── help-article-page.tsx
└── components/
    ├── HelpSearch.tsx
    ├── HelpCategoryCard.tsx
    ├── HelpArticleList.tsx
    ├── ArticleFeedback.tsx
    └── RelatedArticles.tsx
```

**Route Registration:** Added to `common-routes.tsx` under `/help/*` paths.

### 3.4 UI Components & Patterns

- **Layout:** Full-width container, consistent with landing page
- **Search:** Reusable `HelpSearch` component (form GET to `/help`)
- **Category Grid:** 1/2/3 column responsive (matching landing page sections)
- **Article List:** shadcn `Table` or `Nav` pills
- **Article Body:** `dangerouslySetInnerHTML` for sanitized HTML (TipTap output)
- **Feedback:** Yes/No buttons → POST to `help.react`, shows toast, replaces with thank-you
- **Related Articles:** Sidebar on desktop, collapsible on mobile
- **SEO:** Meta tags via existing SEO system (`seo.help.*` views)

---

## 4. Admin Interface (React Settings Pages)

### 4.1 API Routes (under `/api/admin/help`, `isAdmin` middleware)

| Method | URI | Controller |
|--------|-----|------------|
| GET | `/categories` | `AdminHelpCategoryController@index` |
| POST | `/categories` | `AdminHelpCategoryController@store` |
| GET | `/categories/{id}` | `AdminHelpCategoryController@show` |
| PATCH | `/categories/{id}` | `AdminHelpCategoryController@update` |
| DELETE | `/categories/{id}` | `AdminHelpCategoryController@destroy` |
| POST | `/categories/sort` | `AdminHelpCategoryController@sort` |
| GET | `/articles` | `AdminHelpArticleController@index` |
| POST | `/articles` | `AdminHelpArticleController@store` |
| GET | `/articles/{id}` | `AdminHelpArticleController@show` |
| PATCH | `/articles/{id}` | `AdminHelpArticleController@update` |
| DELETE | `/articles/{id}` | `AdminHelpArticleController@destroy` |

### 4.2 Settings Pages

```
common/foundation/resources/client/admin/settings/help/
├── help-settings.tsx                   # Tab container
├── help-categories-settings.tsx        # Drag-sort table + CRUD
├── help-articles-settings.tsx          # Filterable table + CRUD
├── category-form-dialog.tsx            # Create/edit category
└── article-form-dialog.tsx             # Create/edit article (TipTap)
```

**Integration:** Added as tab in `AdminSettings` (like Landing Page settings).

**Components Used:**
- `CrupdateResourceLayout` for dialogs
- `useSortable` (dnd) for category reordering
- `react-hook-form` + `@tanstack/react-form` for forms
- `TipTap` editor for article body (Linket already has `@tiptap/react`)
- `DataTable` (TanStack Table) for article list with filters

---

## 5. Database Migrations

Two migrations following Linket naming convention:
- `YYYY_MM_DD_HHMMSS_create_help_categories_table.php`
- `YYYY_MM_DD_HHMMSS_create_help_articles_table.php`

Both in `database/migrations/` (not inside module).

---

## 6. Routing Registration

### 6.1 Public Routes (`routes/web.php` or `routes/api.php`)

```php
Route::name('help.')->prefix('help')->group(function () {
    Route::get('/', 'HelpController@index')->name('index');
    Route::get('categories/{slug}', 'HelpController@category')->name('category');
    Route::get('articles/{slug}', 'HelpController@article')->name('article');
    Route::post('articles/{slug}/react', 'HelpController@react')->name('react');
});
```

### 6.2 Admin API Routes (`routes/api.php`)

```php
Route::name('admin.help.')->prefix('admin/help')->middleware('isAdmin')->group(function () {
    Route::apiResource('categories', AdminHelpCategoryController::class);
    Route::post('categories/sort', [AdminHelpCategoryController::class, 'sort'])->name('categories.sort');
    Route::apiResource('articles', AdminHelpArticleController::class);
});
```

### 6.3 Client Routes (`common-routes.tsx`)

```typescript
{
    path: 'help',
    children: [
        { index: true, lazy: () => import('@common/help/help-index-page') },
        { path: 'categories/:slug', lazy: () => import('@common/help/help-category-page') },
        { path: 'articles/:slug', lazy: () => import('@common/help/help-article-page') },
    ],
},
```

---

## 7. Enhancements Over MarketBob

| Feature | MarketBob | Linket Implementation |
|---------|-----------|----------------------|
| Editor | Textarea | TipTap rich editor |
| Search | SQL LIKE | Laravel Scout + Meilisearch |
| SEO | Basic | Full meta tags + JSON-LD schema |
| Admin | Blade + jQuery | React/Inertia + TanStack Table |
| Sorting | AJAX endpoint | `useSortable` drag-drop |
| Analytics | View counts only | TrackedEvent integration |
| API | None | RESTful admin API |

---

## 8. Testing Strategy

- **Unit:** Model scopes, slug generation, relationships
- **Feature:** Public page rendering, search, feedback, admin CRUD
- **Browser (Playwright):** Category navigation, article view, feedback submission, admin drag-sort
- **Static Analysis:** PHPStan, TypeScript strict mode

---

## 9. Dependencies (Already in Linket)

- `cocur/slugify` — slug generation
- `laravel/scout` + `meilisearch/meilisearch-php` — search
- `@tiptap/react` + extensions — rich editor
- `@tanstack/react-table` — admin tables
- `@dnd-kit/core` / `useSortable` — drag sorting
- `react-hook-form` + `@hookform/resolvers` — forms
- `lucide-react` — icons
- `shadcn` components — UI primitives

---

## 10. Implementation Order

1. **Models & Migrations** — Database foundation
2. **Public Controller + Routes** — Read-only pages first
3. **React Public Pages** — Index, Category, Article with search
4. **Admin API Controllers** — Full CRUD + sort
5. **Admin Settings Pages** — Categories tab, Articles tab
6. **Search Integration** — Scout indexing + frontend search
7. **SEO & Polish** — Meta tags, schema, accessibility
8. **Tests** — Unit, feature, browser

---

## 11. Acceptance Criteria

- [ ] `GET /help` renders category grid with search
- [ ] `GET /help/categories/{slug}` shows paginated articles
- [ ] `GET /help/articles/{slug}` shows article with feedback + related
- [ ] `POST /help/articles/{slug}/react` records like/dislike
- [ ] Admin can CRUD categories with drag-sort
- [ ] Admin can CRUD articles with TipTap editor
- [ ] Search returns relevant results (Scout)
- [ ] SEO meta tags present on all public pages
- [ ] All pages responsive and accessible
- [ ] Tests pass (PHP + TypeScript + Playwright)