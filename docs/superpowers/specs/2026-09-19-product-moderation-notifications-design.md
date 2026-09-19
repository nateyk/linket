# Product Moderation Notifications Design

## Goal

Notify creators when an admin approves or rejects their product submission or an
update to a live product, so they no longer have to poll the dashboard.

## Background

The admin digital-products controller moderates products through a single
decision path (the `applyDecision()` helper introduced with bulk moderation):
it locks the row, validates the actionable state (`pending_approval` or
`approved + review_requested_at`), updates the product, and records a
`digital_product_review_events` audit row. Single approve/reject and the bulk
endpoints all call it.

The app already has Laravel notifications wired for both channels used elsewhere:

- `app/Payments/Notifications/ChapaRenewalReminder` shows the modern pattern:
  `ShouldQueue`, `via(['mail','database'])`, `viaQueues`, `toMail`, `toArray`.
- `common/foundation/src/Notifications/Resources/NotificationResource` documents
  the in-app payload shape (`mainAction`, `buttonActions`, `lines`), and
  `common/foundation/resources/client/notifications/notification-line.tsx`
  renders `lines[].content` as HTML.

## Decisions

- Notify on all four moderation outcomes: `approved`, `rejected`,
  `update_approved`, `update_rejected`.
- Channels: in-app (`database`) and queued email (`mail`), no user-preference
  plumbing in this change.
- Dispatch from `AdminDigitalProductsController::applyDecision()` — one
  integration point covers single and bulk moderation.
- Do **not** notify for creator-initiated transitions: auto-approval on submit
  when review is disabled, and course auto-publish. Those are the creator's own
  actions.
- The notifications branch is stacked on the bulk-moderation branch (PR #25)
  because `applyDecision()` does not exist on `main`; the PR merges after #25.

## Backend

### Notification — `app/Storefront/Notifications/ProductModerationNotification.php`

```php
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
        return ['mail' => 'mail', 'database' => 'default'];
    }

    public function shouldSend(object $notifiable, string $channel): bool
    {
        return DigitalProduct::withTrashed()->whereKey($this->productId)->exists();
    }

    public function toMail(object $notifiable): MailMessage { /* see copy below */ }

    public function toDatabase(object $notifiable): array { /* see payload below */ }
}
```

The product is loaded inside `toMail`/`toDatabase` with
`DigitalProduct::withTrashed()->with('cover')->find($this->productId)`, matching
the existing `SendStorefrontReviewNotification` job which loads by id rather than
serializing the model. `shouldSend` cancels the notification if the product has
since been deleted, so a queued job for a removed product does not error.

### Message copy

`$this->event` selects the wording:

| event | mail subject | in-app primary line |
| --- | --- | --- |
| `approved` | Your product is live | Your product "…" is now live. |
| `update_approved` | Your product update is live | Your update to "…" is now live. |
| `rejected` | Your product needs changes | Your product "…" needs changes. |
| `update_rejected` | Your product update needs changes | Your update to "…" needs changes. |

For `rejected` and `update_rejected`, a second line/paragraph carries the
reason when present. The action link is:

- `course` products: `/dashboard/my-products/{id}/course`
- otherwise: `/dashboard/my-products/{id}/edit`

with the label `Open product` for approvals and `Fix and resubmit` for
rejections.

### In-app payload

```php
[
    'mainAction' => ['label' => $label, 'action' => $url],
    'lines' => [
        ['content' => e($primaryLine), 'type' => 'primary'],
        // when a reason exists:
        ['content' => e($reasonLine), 'type' => 'secondary'],
    ],
]
```

Product titles and rejection reasons are escaped with `e()` because the client
renderer injects `content` as HTML.

### Dispatch

In `AdminDigitalProductsController::applyDecision()`:

- add `->with('creator')` to the locking query so the creator is eager-loaded
  (no lazy load under `Model::preventLazyLoading()`);
- have the transaction return `['product' => $product, 'event' => $eventName]`;
- after the transaction commits, `$product->creator?->notify(new
  ProductModerationNotification($product->id, $eventName, $reason))`.

Because single `approve`/`reject` and the bulk endpoints call `applyDecision`,
all four outcomes notify with no per-endpoint code.

## Testing

New `tests/Feature/ProductModerationNotificationTest.php`:

1. Approving a `pending_approval` product notifies the creator once with
   `event = 'approved'` on `mail` and `database` (`Notification::fake` +
   `assertSentTo`).
2. Rejecting with a reason notifies with `event = 'rejected'` and the reason;
   editing a live product to queue review then approving/rejecting notifies
   `update_approved` / `update_rejected`.
3. Bulk approve of two actionable products dispatches two notifications;
   ineligible selections dispatch none.
4. Without `Notification::fake`, approving writes one `database` notification
   row for the creator.
5. `toMail` returns a `MailMessage`, and `shouldSend` is false for a
   missing/trashed product.

Verification gate before any PR: `npx tsc --noEmit --skipLibCheck`,
`npm run test`, `npm run build`, `ddev exec ./vendor/bin/pest`, then
`git restore public/build/manifest.json`. (Frontend is unchanged; the gate is run
for completeness.)

## Out of Scope

Per-user notification preferences/channels, digests or batching (a bulk action of
N products sends N queued emails), admin-side notifications, and notifications
for submission/queueing or creator-initiated auto-approval.

## Risks

- **Queue dependency:** mail runs on the `mail` queue, which the app already
  requires for other notifications.
- **Bulk volume:** N selected products produce N emails; acceptable and noted.
- **Injection:** titles/reasons are escaped before the HTML-rendered in-app line.
- **Deleted product:** `shouldSend` cancels the notification.
