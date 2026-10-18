# Creator Services Design

## Intent

Linket creators already sell digital products with checkout and payouts. This feature adds a second, separate kind of listing: a **service** the creator performs for a client (logo design, branding, consultation). Services are showcased on the creator's storefront, but no money moves through Linket. Interested visitors send a quote inquiry; the creator takes the conversation and contract off-platform.

Services are **not** mixed into digital products. They have their own dashboard area and their own public tab.

## Goals

- A creator can create, edit, publish, unpublish, and delete services from a dedicated **My Services** dashboard area.
- A service supports cover and gallery images, title, category, skills, description, video preview, live-demo link, contact buttons, starter/standard/premium-style packages, and FAQs.
- A service belongs to one storefront and appears at `/{storeSlug}/services` and `/{storeSlug}/services/{slug}`.
- A visitor can send an inquiry with name, email, phone, and message, tied to the service and optionally a package.
- The creator sees inquiries in the dashboard, can open them (marking them read), change status, and delete them.
- The creator is notified by email and in-app notification when an inquiry arrives.
- No payment, order, checkout, commission, rating, star, or review flow exists for services.

## Non-goals

- Payments, contracts, invoices, or payouts for services.
- Ratings, stars, or reviews.
- Admin moderation or approval of services.
- Service analytics.
- Multiple stores per service, or service placement on several storefronts.
- Reordering services in the dashboard (packages and FAQs keep their order).
- Service search or marketplace discovery across creators.

## Users and flows

### Creator

1. Opens **My Services** from the dashboard sidebar.
2. Sees their services with cover, title, status, starting price, package count, and inquiry count.
3. Creates a service: picks a store, fills basics, uploads media, adds packages, FAQs, and contact buttons, then publishes.
4. Opens **Inquiries** to read messages, mark them contacted/won/lost/archived, and contact the visitor by email or phone.
5. Copies or opens the public service URL.

If the creator has no storefront, the page shows an empty state linking to store creation.

### Visitor

1. Visits a creator's storefront and sees a **Services** tab when the creator has published services.
2. Opens `/{storeSlug}/services` to browse service cards.
3. Opens a service detail page: gallery, title, category, skills, description, FAQ, packages, about-the-seller, direct contact buttons.
4. Clicks **Request a quote** on a package (or **Contact** for direct channels), fills name, email, phone, message, and sends.
5. Sees a success state. The creator receives the inquiry.

## Public URLs

- `GET /{storeSlug}/services` — services list for that storefront.
- `GET /{storeSlug}/services/{serviceSlug}` — service detail.
- `GET /api/v1/public/stores/{storeId}/services` — published services for the storefront.
- `GET /api/v1/public/stores/{storeId}/services/{serviceSlug}` — published service detail.
- `POST /api/v1/public/stores/{storeId}/services/{serviceSlug}/inquiries` — create inquiry (throttled).

## Dashboard URLs

- `/dashboard/services` — list.
- `/dashboard/services/new` — create.
- `/dashboard/services/{id}/edit` — edit.
- `/dashboard/services/inquiries` — inquiry inbox.
- `/dashboard/services/inquiries?service_id={id}` — filtered inbox.

## Data model

`creator_services`
- `id`, `workspace_id`, `user_id`, `store_id`
- `title`, `slug` (globally unique), `short_description`, `description` (sanitized HTML)
- `category`, `skills` (JSON array)
- `cover_file_entry_id`, `video_url`, `live_demo_url`
- `contact_channels` (JSON array of `{type, label, value}`; types: whatsapp, telegram, email, phone, link)
- `status` (`draft` or `published`)
- timestamps, soft deletes
- indexes on `workspace_id`, `user_id`, `store_id`, `status`, unique `slug`

`creator_service_images`
- `id`, `creator_service_id`, `file_entry_id`, `position`, timestamps, unique service+file

`creator_service_packages`
- `id`, `creator_service_id`, `name`, `description`, `price_cents` (nullable = quote-only), `currency`, `delivery_days` (nullable), `revisions` (nullable), `features` (JSON array), `position`, timestamps

`creator_service_faqs`
- `id`, `creator_service_id`, `question`, `answer`, `position`, timestamps

`creator_service_inquiries`
- `id`, `creator_service_id`, `creator_service_package_id` (nullable), `name`, `email`, `phone` (nullable), `message`, `status` (`new`, `contacted`, `won`, `lost`, `archived`), `read_at` (nullable), timestamps
- indexes on service, status, created_at

## API behavior

### Creator endpoints

- `GET /api/v1/services` — workspace/user-scoped list with package + inquiry counts.
- `POST /api/v1/services` — create service with nested packages, FAQs, gallery file ids, contact channels.
- `GET /api/v1/services/{id}` — owner-only detail.
- `PUT /api/v1/services/{id}` — update and sync children.
- `DELETE /api/v1/services/{id}` — soft delete.
- `GET /api/v1/services/inquiries` — owner's inquiries, filterable by `service_id` and `status`, paginated.
- `GET /api/v1/services/inquiries/{id}` — owner-only; marks `read_at`.
- `PATCH /api/v1/services/inquiries/{id}` — update status.
- `DELETE /api/v1/services/inquiries/{id}` — delete.

Ownership is enforced by `workspace_id` + `user_id` (same pattern as digital products). Nested child rows are replaced inside a transaction.

### Public behavior

- Only `published` services of the requested store are visible.
- Draft services return 404.
- The inquiry endpoint validates name, email, message, and that the package belongs to the service.
- The endpoint is throttled at 10 requests per minute and is CSRF/API-access exempt like existing public checkout.
- On success the endpoint returns 201 with a translated success message and queues `NewServiceInquiryNotification` to the creator (mail + database).

## UI decisions

- Components come from `common/foundation/resources/client/shadcn` first, then `ui`.
- All visible copy goes through `<Trans message="..." />` or `trans(message(...))`.
- Use design tokens only; no raw gray values.
- Icons are lucide.
- The public service page inherits storefront appearance tokens (background, text, surface, button style) the same way the digital product page does.
- The service list card shows cover, title, category, short description, starting price or "Request a quote", and package count. No stars.
- The detail page uses a two-column layout on desktop (content left, packages and seller card right) and a single column on mobile. Packages are tabs when there are two or more.
- Inquiry form is a dialog, accessible by keyboard, with a success state.
- Direct contact buttons render only for valid configured channels: WhatsApp -> `https://wa.me/{digits}`, Telegram -> `https://t.me/{handle}`, email -> `mailto:`, phone -> `tel:`, link -> validated URL.

## Edge cases

- Creator with no storefront: dashboard shows a create-store empty state; API rejects creation without a valid store.
- Slug collisions: generated slug gets `-2`, `-3`, ... suffix.
- A service with zero packages is allowed; the detail page then shows only the inquiry form.
- Package with no price displays "Request a quote".
- Deleting a service soft-deletes it; inquiries remain in the table and are still viewable from the inquiry resource via the trashed service relation.
- A visitor cannot submit an inquiry for a draft service or a package belonging to another service.
- Contact channel values are validated server-side by type before being stored.

## Testing

- Feature tests cover CRUD, ownership, slug generation, nested sync, public visibility, inquiry creation/notification, and inquiry status.
- Frontend unit tests cover form-state normalization, API error mapping, contact URL building, and price display helpers.
- Verification: targeted `php artisan test --compact`, `npm run test -- <files>`, `npm run lint`, `npm run build`.
