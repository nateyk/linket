# Independent settlement reconciliation — Chapa v1 and historical Verify.et

This gate is **read-only**. It does not call provider APIs, update orders, post journals, requeue transfers, release held balances, rotate credentials, retire Verify.et handlers, or enable Chapa payouts.

## Run the local journal/legacy audit

Use an explicitly authorized database connection:

```sh
php artisan marketplace:audit-independent --json
php artisan billing:audit-verify-et-retirement --json
```

The independent audit **fails closed** without an offline provider export, even when the journal balances. The existing scheduled `marketplace:reconcile` command is different and may mutate state; do not run it as a substitute for this read-only gate.

## Supply separately obtained provider evidence

Export the **complete marketplace-scoped history** from the providers' independent records, using the same provider settlement cutoff for all categories. Normalize amounts to integer cents; do not use UI totals or Linket's own cached verification payload as provider evidence.

Save a JSON file outside the repository, with restricted filesystem permissions:

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
  ],
  "verify_et_verifications": [
    {"reference": "historical-verification-ref", "amount_cents": 10000, "currency": "ETB", "status": "success"}
  ]
}
```

The sample is **not real financial evidence**. Lists may be empty only when the complete provider history actually contains no transactions of that type. Chapa references must be normalized to Linket's stored merchant references; refund matching prefers the saved external refund reference. Historical verification status values must be mapped to the stored terminal status, with discrepancies reviewed manually rather than silently coerced.

```sh
php artisan marketplace:audit-independent --evidence=/secure/private/provider-reconciliation.json --json
```

The command compares provider reference, amount, currency and settlement status, plus exact order/refund/payout journal entries; it flags unknown provider records and Linket records missing from the provider export. Duplicate references, invalid currencies/statuses, malformed JSON, missing tables or query errors fail closed. Reports contain aggregate issue codes and internal row IDs, not provider references, credentials or receiving-account data. At most the first 100 issue details are included; `issue_count` is not capped.

## Review the results

- **Chapa orders:** paid/refunded platform-collected orders must have a successful payment attempt with matching amount/currency and a balanced `sale_settled` journal attributed to the correct creator/workspace.
- **Completed refunds:** refund evidence must match gross refund and reversal entries; commission and creator liability debits must match the recorded amounts.
- **Withdrawals:** reserved and disbursed/released entries must match the payout; uncertain, prepared or open transfers remain blocked. Paid transfers must have provider success. Manual payouts without provider intents require separate independent settlement review.
- **Historical Verify.et:** outstanding verifications, webhooks, subscriptions, deliveries and disputes remain blockers under the separate retirement audit. Seller-collected historical orders must **never** be recorded as platform Chapa liabilities.
- **Ledger:** existing double-entry anomalies remain blocking. The signed per-workspace/currency audit in PR #309 provides additional deficit detection once current branch protection allows its merge.

An exit code of **0 means only “candidate for manual evidence review.”** It is **not** permission to retire Verify.et, remove retention records, alter payouts, or enable Chapa v1 live transfers. A responsible administrator must independently authenticate the provider export, inspect the exception list, verify callback/retry windows, agree data retention, back up the old evidence, and explicitly sign off.

This implementation does **not** claim to have reconciled actual production transactions. No provider export, production database, or provider credential is supplied to this PR.
