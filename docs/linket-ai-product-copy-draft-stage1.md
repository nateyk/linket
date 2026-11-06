# Linket AI PR-05: Private structured product-copy proposals (stage 1)

Status: In Progress, behind three default-OFF feature flags. NOT READY FOR PRODUCTION or merge.

## Implemented backend
- Laravel AI SDK structured Agent returns title and description with strict plain-text validation. Source facts are restricted to creator-owned product type/title/current description; no buyer information, payment references, receiving accounts or order history are transmitted.
- Creator/Pro/workspace authorization, Free clear vs Pro advanced tones, draft/rejected-only status, private no-store API and source fingerprint revision checks before creator use. No direct product writes or publication.
- Usage quota and provider budget reserve before an OpenAI SDK prompt. An additional provider deployment flag defaults OFF. Tests use a faked SDK agent; no live provider calls.
- The encrypted admin-managed API key is supplied to an isolated on-demand Laravel AI v1.3 provider (commit f93b4641) instead of overriding global OpenAI configuration. The real SDK facade import was verified in commit 624482da. PHP-FPM/worker credential lifecycle still requires production-like staging and independent AppSec verification.

## Release blockers
1. Implement true provider cost reconciliation, pricing and reservation settlement. Successful and uncertain calls stay RESERVED; do not fabricate spend or auto-refund a possibly charged request.
2. Prove model support, token bounds, safe staging SDK credential binding and full provider outage/retry handling.
3. Creator preview/edit/explicit-use UI is implemented with focused tests, but authenticated device-level keyboard/200% zoom/contrast and error-recovery QA remain open. The service never publishes.
4. Add broader concurrency, prompt-injection, quota, XSS and error-recovery tests; require full exact-head CI, independent AppSec and deployment approval.

Feature flags stay OFF and the existing Verify.et, storefront review and paid-content fulfillment flows remain unchanged.