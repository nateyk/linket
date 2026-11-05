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
