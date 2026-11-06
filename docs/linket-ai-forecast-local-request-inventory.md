# PR-08 — Authorized local Verify.et request inventory

`CreatorForecastLocalRequestInventory` is a read-only internal Laravel service. It reauthorizes a creator's current verified Pro entitlement, forecast flag and workspace before assembling request-ID SHA256 fingerprints from order-scoped Verify.et attempts, including pending/failed states. Results are bounded to an explicitly closed UTC window of at most 30 days and capped at 10,000 records. Raw request IDs never leave the method.

The service excludes Pro subscription verifications, other workspaces, external clients and any Verify.et requests that did not originate in the selected storefront. These exclusions are intentional and mean its request set **cannot be equated** to all API-key/account history. Compare against an independently scoped provider snapshot only as an operator diagnostic. A match **never attests provider-wide completeness**, and no forecast may be published.

Before integrating with genuine independently operated producers, independently prove the provider account/key scope, write/read permissions, retention history, all external client submissions, late/verifying states and a signed global closing event inventory. There is no public HTTP endpoint, production data collection, key access, or change to payment fulfillment in this work package.
