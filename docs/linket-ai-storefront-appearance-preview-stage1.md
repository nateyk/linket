# PR-09 — Storefront Appearance Preview Foundation (2026-11-05)

Status: **In Progress — first read-only, deterministic preview slice only.** WIP integrated PR #94. No live AI call, no write route, no public launch.

## Implemented
- Strict three-preset allowlist (calm/clear/profile), grounded in existing Linket appearance keys: layout + button variant/radius/shadow.
- Pro-only access through CreatorAiAccess and current Verify.et-backed Pro proof, authenticated creator ownership and workspace membership, additional default-OFF deployment flag.
- Private/no-store GET preview exposing only changed safe fields and source revision fingerprint; POST only validates the same revision. Neither route performs a save, publish, theme mutation, quota reservation, or provider call.
- Arbitrary raw colors, image URLs, HTML, CSS, JS, fonts and hideBranding are never accepted in the preset schema or emitted in suggestions.

## Not yet completed
- Real AI-generated structured proposals through the existing reserved-cost pipeline (blocked until invoice reconciliation); current presets are deterministic UI-ready examples.
- Creator UI before/after display integrated with the current store Appearance editor, local edit/discard, explicit creator apply through existing mutation validation and review. No direct appearance writes from AI.
- E2E authenticated Pro/browser coverage, concurrent stale checks at save time, WCAG 2.2 AA color ratios/keyboard/200% zoom/mobile and independent AppSec.
- CI at exact branch SHA for this slice and independent release approval. All flags remain OFF.


## Local verification checkpoint — 2026-11-05

- Checkout: isolated WSL worktree at `7c7327c5`; original `main` worktree and its existing changes untouched.
- `tsc --noEmit` succeeded using Node 24.
- Two focused Vitest files, including existing Appearance DOM tests: **6 passed**. Pre-existing React slider `act(...)` warnings remain.
- PHP syntax check succeeded for service, controller, feature test, route and configuration files; Laravel route list resolved all three preview/availability/revision routes.
- DDEV sandbox uses synthetic app credentials and an isolated MySQL `db_test`. The repository test guard denied the normal `db` schema. Migration/seeding of `db_test` was blocked by the remote tool safety check, so **feature Pest tests remain unverified**.
- GitHub CI at exact PR-09 head is not present. Earlier green [CI #42005498103](https://github.com/nateyk/linket/actions/runs/42005498103) applies to pre-PR-09 SHA `0861b168` only. Do not claim new backend green.
- Git remote push from WSL was denied by missing GitHub HTTPS authentication. An empty local-only CI-trigger commit was not pushed.
- The preview does not write appearance config or contact an AI provider. This is deliberately **not** a complete AI customization release. Before exposing an Apply button, enforce compare-and-swap revision validation atomically in the normal storefront save path, test stale/foreign writes, and complete mobile/200% zoom/browser + AppSec review. Keep default-OFF gate and WIP/no-merge decision.
