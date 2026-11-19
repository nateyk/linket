# Independent Chapa marketplace settlement reconciliation

This audit is **read-only**. It compares stored Linket orders, refunds, payout intents and ledger journals against independently obtained Chapa evidence. It does not initiate checkout, send transfers, release held balances, update orders or enable payouts.

## Run the audit

With an authorized database connection:

```bash
php artisan marketplace:audit-independent --json
```

An audit without external evidence fails closed, even if internal journals balance. The scheduled `marketplace:reconcile` command performs operational reconciliation and is **not** a substitute for this independent check.

Export complete Chapa payment, refund and payout records for the same scope and cutoff. Do not use Linket UI totals as independent evidence. Normalize ETB to integer cents and save the export outside the repository, with strict file permissions:

```json
{
  "schema_version": 1,
  "scope": "complete_marketplace_history",
  "chapa_payments": [
    {"reference": "merchant-payment-ref", "amount_cents": 100000, "currency": "ETB", "status": "success"}
  ],
  "chapa_refunds": [
    {"reference": "merchant-refund-ref", "amount_cents": 40000, "currency": "ETB", "status": "completed"}
  ],
  "chapa_payouts": [
    {"reference": "merchant-payout-ref", "amount_cents": 50000, "currency": "ETB", "status": "success"}
  ]
}
```

Those are sample values, not provider records. Lists must reflect the complete provider history in scope.

```bash
php artisan marketplace:audit-independent --evidence=/secure/private/chapa-reconciliation.json --json
```

The command checks references, amounts, currency, final status and corresponding journals; identifies provider-only records and unmatched Linket records; and blocks sign-off on duplicate references, inconsistent sums, malformed evidence, missing tables, negative liabilities or incomplete provider exports. Provider secrets and receiving-account details must never appear in log output.

A successful command result means **candidate for manual review**, not approval for live Chapa transfers. An authorized operator must validate the source of the Chapa export, examine any exceptions and approve live-payout activation separately.
