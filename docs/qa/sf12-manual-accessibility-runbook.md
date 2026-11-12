# SF-12 — manual accessibility and authenticated Appearance acceptance

**Release gate:** [SF-12 manual acceptance #172](https://github.com/nateyk/linket/issues/172). SF-12 remains **QA** and SF-13 **NO-GO** until every required review item is evidenced, defects are resolved, and the product owner signs off. Browser automation is supporting evidence, not a substitute.

**Scope:** public creator storefront/profile, product, service/package selector, inquiry dialog, authenticated Store Builder (including expanded preview and Save), English/Amharic, saved light/dark/gradient Appearance, native zoom, NVDA/Chrome, VoiceOver/Safari and touch hardware.

## Prerequisites, privacy and stop conditions

1. Use an **approved nonproduction staging environment**, a dedicated disposable seller account, a synthetic published product, and a synthetic published service with Basic/Standard/very long Premium package. Avoid customer identities, live money, real contact messages and production API tokens.
2. Confirm the staging deployment's exact **Git SHA**, base URL, reviewer, date/time, OS/browser/assistive technology version, system font scaling, physical display resolution and browser zoom. Record these *before* testing, in a private evidence index.
3. Confirm the actual staging **Amharic** localization is enabled and its translated lines exist. The default localization seeder creates **English only** on a fresh installation; the language list containing Amharic does *not* mean an Amharic locale is installed. If `am` is not available in the admin's Localizations area or meaningful text is untranslated, record **BLOCKED**, never PASS. Do not mistake Amharic in product content for translated application UI.
4. Keep a fresh Chrome/Firefox profile and a separate NVDA/VoiceOver browser session. No anonymous browser script can substitute for an authenticated seller Save/publish journey.
5. **Never submit the real inquiry form or paid/free checkout.** Only open/close dialogs, trigger client-side required validation without sending an inquiry, and inspect controls.
6. **Do not merge** integration [PR #171](https://github.com/nateyk/linket/pull/171). Source PRs #162, #163, #167 need separate approval. Never deploy based on this checklist alone.

## Evidence record (one row per scenario)

| Field | Required value |
| --- | --- |
| Case ID / decision | `SF12-A01`, `PASS / FAIL / BLOCKED / NOT RUN` |
| Environment | Staging URL, deployed full SHA, test seller/store slug |
| Reviewer | Reviewer identifier, date/time, OS, browser + version, AT version |
| Reproduction | Exact steps performed, chosen language/theme/zoom |
| Observed outcome | What was visibly rendered / spoken, including focus destination |
| Contrast | Foreground, effective background, sample point, computed ratio |
| Evidence | Screenshot, clip, transcript or issue/PR link; redact personal data |
| Defect | GitHub issue/PR link, severity, retest evidence, decision signer |

Every numbered case below starts **NOT RUN**. Passing a related Playwright case does not change its status.

## A — authenticated Save/published Appearance (seller session)

- **A01** Open an existing QA seller storefront and its authenticated Store Builder. Capture current published store, product and service URLs, styles and SHA. Open the expanded preview; confirm no duplicate frames/control panels and that all controls are keyboard-reachable.
- **A02** In the builder set *light* Appearance: background, text, heading, button, font and radius, then Save. Reload the builder and the published store/product/service at both a desktop and 375px mobile viewport. Compare **actual saved** values and screenshots with the preview; test background, typography, cards, buttons and portal dialog. Record discrepancies.
- **A03** Repeat A02 for *dark* Appearance, checking buttons and fields against the dark saved background.
- **A04** Repeat A02 for *gradient* Appearance. Inspect **multiple gradient stops and overlays** under text and focus elements, not just a single color token.
- **A05** Modify Appearance **without saving**: expanded preview should update, but a separate published tab must not change. Cancel/reload and verify draft is discarded; Save deliberately and repeat publication comparison. The isolated iframe-postMessage test covers only the transport, **not** this authenticated journey.
- **A06** Restore the agreed synthetic baseline, capture post-restore published pages and do not modify live seller data.

## Z — real browser-toolbar zoom and real touch

- **Z01** With Chrome browser's **⋮ > Zoom > 200%** (not CSS `zoom`, devtools device emulation or a small viewport), test desktop published store, product, service and inquiry dialog. Record the toolbar value and screenshots at **100% and 200%**. Tab through all meaningful actions; detect hidden or clipped text, horizontal page overflow, sticky footer obscuring content, focus obscured by overlays and package tab scrolling.
- **Z02** Repeat Z01 in **Firefox toolbar zoom 200%**. Record native browser and OS versions. A Playwright 320px test alone is insufficient for either case.
- **Z03** On a real 360–430 CSS-pixel equivalent phone, test package-strip swiping, 44px-style comfortable touch targets, tap/scroll, sticky safe-area footer, expanded dialog content and mobile menu; verify at least one iOS Safari and one Android Chrome session if devices are available. If absent mark BLOCKED.
- **Z04** Repeat Z01 with browser keyboard-only Tab/Shift+Tab, arrow keys, Enter/Space, Escape; check arrow focus + **Enter activation** on service tabs, Name input focus on open, errors, and focus restored to the trigger on Escape. Enable **reduced motion** in OS/browser preferences and check usability.

## L — real Amharic/English UI, not just mixed-script fixtures

- **L01** Confirm active installed Amharic `am` localization, localized translation lines, and the public site's `lang=am`/language switcher behavior. Check `<html lang>` and direction where appropriate. If the environment only has English or an untranslated locale, report BLOCKED and create a localization configuration/content task.
- **L02** In Amharic and English, inspect labels for **Products, Services, Profile, Packages, Request a quote, Name, Email, Message, Send inquiry, Back to services** and the builder Appearance/Save controls. Record each missing translated string. User-generated Amharic product/service titles do not count as UI translation.
- **L03** Use a long Amharic + English title, about paragraph and package label. At native zoom 100/200% and on mobile, check glyph rendering, wrapping, row heights, truncation, bidirectional punctuation, touch and focus; capture both languages.

## C — measured contrast, interactive and portal states

Evaluate **real pairs** using computed text/foreground and the effective rendered background. Composite transparency on the actual underlying surface. Use WCAG 2.2 AA: **normal text 4.5:1**, **large text 3:1**, **non-text UI/focus indicator 3:1**. Report ratios to two decimals, not eyeballed judgments. The synthetic Playwright card samples are insufficient for a global pass.

- **C01** In every saved light/dark/gradient scheme, measure the creator heading, muted bio, product price, service price, card text, button label, selected/unselected package tabs, seller email and alerts. Sample gradient at the *worst real position* plus additional stops.
- **C02** Open the service inquiry dialog in each scheme. Check dialog background/text, labels, placeholders, input borders, required/invalid indicators and **validation error text**. Submit **empty fields only** to trigger client-side errors: each error must be accessible by its associated field, correctly announced, and no inquiry network POST should occur. Close with Escape.
- **C03** Keyboard-focus the public CTA, package tabs, seller links, form fields, modal close and builder Save. Record focus indicator visibility and contrast against the immediate backdrop, plus occlusion/overlap. Do not claim non-text focus 3:1 if the actual ring/background pair is unresolved.
- **C04** Confirm contrast of at least one enabled/hover/selected/disabled state on each interactive component family. Disabled controls may be exempt from the text-contrast criterion, but document visual discoverability.

## SR — real assistive-technology acceptance

- **SR01 Windows, NVDA + Chrome:** record NVDA version and speech output. Navigate landmark and heading structure, long mixed-script creator/product/service names, tabs (arrow moves focus; Enter selects; `aria-selected` announced), seller contact link names and purpose. Use keyboard alone; focus must remain visible and never be trapped.
- **SR02 NVDA + Chrome:** Open service quote dialog from a focused trigger. Verify dialog title and description announcement, focus in Name, field labels, optional Phone, required and invalid Email errors (including description association), Escape close, and **focus return** to trigger. Never send an inquiry.
- **SR03 macOS or iOS VoiceOver + Safari:** repeat public headings/landmarks, product CTA, service package selection, email link, quote dialog opening, labels/errors, Escape/dismissal and focus restoration. Record spoken output or an annotated transcript; no simulator alone can substitute for native VoiceOver.
- **SR04** Check English and Amharic speech/language detection using installed speech voices where supported. If the system lacks a working Amharic voice, record BLOCKED (do not assert pronunciation quality from text screenshots).

## Release sign-off

- [ ] Attach a completed evidence record for **A01–A06** and link any defects.
- [ ] Attach **Z01–Z04** native browser/device screenshots and keyboard results.
- [ ] Attach **L01–L03** actual Amharic and English UI recordings, not fixture-only text.
- [ ] Attach **C01–C04** measured contrast pairs/ratios and interactive state results.
- [ ] Attach **SR01–SR04** NVDA/VoiceOver voice/focus acceptance.
- [ ] Confirm original #162/#163/#167 separately approved/merged and exact merged-`main` SHA verified with full CI + isolated published-page browser QA.
- [ ] Product owner explicitly authorizes SF-13 GO and a separately approved deployment.

Any **FAIL** or **BLOCKED** required case means SF-12 stays QA and SF-13 stays NO-GO. Update issue #172 with evidence and request retest; never infer manual completion from GitHub Actions.
