# Homepage SEO implementation plan

**Goal:** Correct homepage search metadata and keep crawler content aligned with the existing React landing page.

**Architecture:** Retain Laravel's existing crawler prerender and React/Vite UI. The controller's resolved sections are the single content source; preserve editable SEO overrides.

**Scope:** Default homepage metadata, configured social image support, resolved prerender sections, sitemap discovery. No new dependencies, payment changes, global router changes, or firewall modifications.

- [ ] Add PHPUnit regression coverage in `tests/Feature/LandingPageSeoTest.php`; observe expected failures in isolated GitHub CI.
- [ ] Update `resources/views/seo/landing-page/seo-tags.blade.php` with creator-focused title/description and optional `branding.social_image` tags.
- [ ] Update `resources/views/seo/landing-page/prerender.blade.php` to consume the controller's `sections`, including fallback defaults, and retain Blade escaping.
- [ ] Advertise the existing generated sitemap index in `public/robots.txt`.
- [ ] Run CI, inspect rendered test output and cache compilation; document deployment and external verification steps.

**Review focus:** Missing social image; escaped administrator text; default versus stored sections; stale editable template overrides; correct canonical host on production.

**Verification:** Existing CI runs `php artisan test --compact`, view/route/config caches, TypeScript, frontend tests, audits, and production build against synthetic test infrastructure. This workspace lacks PHP/Composer and Git transport credentials, so use the connected GitHub integration and CI. Production is not modified by this PR.

**After deployment:** Set an actual public PNG/JPEG in the existing `branding.social_image` setting. Check for a stored editable homepage SEO template that overrides the default. Run `php artisan sitemap:generate` only if that is the actual registered command (confirm with `php artisan list`); the generator currently writes `public/storage/sitemaps/sitemap-index.xml`. Verify its public URL, metadata, crawler prerender, and adjacent routes. Investigate bot 403s in hosting logs, distinguishing verified search/user agents from training crawlers; do not disable the firewall globally. Search Console recrawl/indexing remains an external check.
