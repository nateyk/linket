# Verify.et retirement gate — Chapa v1 marketplace

Linket's active target is **platform Chapa v1**. The old Verify.et admin UI was retired in PR #302. This does **not** prove old payments are settled or authorize deletion of the backend, signing keys, queued work, financial evidence, or historical rows.

## Read-only inventory

Run against an explicitly selected environment with an authorized database connection:

```sh
php artisan billing:audit-verify-et-retirement --json
```

The command reads aggregate counts only. It never contacts Verify.et, writes settings, changes a payment, releases funds, sends a webhook, or deletes data. It fails closed (exit 1) on missing tables, query errors, or any unresolved record. Never include raw database exports, buyer references, account details or provider signing secrets in the review.

Reported blockers:

- Verify.et storefront orders not in a final paid or expired/cancelled status, and paid orders with unfinished delivery
- Direct verification rows not in a terminal status (including pending, verifying, manual review, and unknown statuses)
- Webhook deliveries that are not processed, ignored or explicit tests
- Pending/unresolved legacy Pro subscription payment attempts, including any awaiting references
- Verify.et subscriptions still lacking an end date
- Open/investigating disputes for Verify.et storefront orders

Historic row totals are **retention inventory**, not permission to erase data. Aggregate counts may overlap across tables; they are not a count of unique transactions.

## Retirement decision

Even an exit-0 result is **only a candidate for human review**. Before retiring webhook/reconciliation handlers or key rotation, require all of:

1. Verified production inventory with no blockers and a repeat audit after the callback/retry window
2. Independent provider reconciliation showing no queued callbacks or pending settlement requests
3. Review of disputes, refunds, subscriptions, paid-content entitlement and invoice retention requirements
4. Agreed migration of any outstanding cases to a protected manual-review path
5. Backup, recovery plan and explicit administrator approval with a recorded retention decision

Until then, keep Verify.et webhook signatures and replay protections, idempotent reconciliation, read access to historical payments, archived credentials needed for verification, and historical record tables. **Do not restore the legacy admin UI or enable new Verify.et checkout.** Do not confuse the retired provider's credentials with Chapa v1 keys.

This PR adds diagnostic tooling only. It does not run an audit against live databases, change provider settings, activate Chapa payouts, or deploy.
