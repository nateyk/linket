# Email branding: settings logo + theme button radius

**Date:** 2026-11-22  
**Status:** Approved — implemented on `fix/email-branding-logo-radius`  
**Builds on:** [2026-11-17 React Email + Laravel Mail](./2026-11-17-react-email-laravel-mail-design.md)

## Goal

Transactional emails should match admin branding and theme: show the site logo (not a hard-coded “Linket” wordmark) and use the theme’s button corner radius instead of always-pill `rounded-full`.

## Background

- Samples sent from production (`mail:send-template-samples`) use `LinketShell` with a text wordmark and CTAs with `rounded-full`.
- Settings already store `branding.logo_dark` / `branding.logo_light` (plus mobile) and each `css_themes.radius` (`none` | `sm` | `md` | `default`).
- Light UI surfaces pick `logo_dark` (dark mark on light chrome); emails use a light page + white card, so the same rule applies.
- Default logos are SVG under `images/…`. Many clients drop SVG in `<img>`; raster uploads (png/jpg/webp/gif) are reliable.

## Decisions

| Decision | Choice |
|---|---|
| Logo source | Settings branding, not hard-coded text |
| Logo preference | Light-mode mark: `logo_dark` → `logo_light` → site name text |
| Absolute URL | Resolve relative paths against `config('app.url')` before render |
| SVG handling | If chosen path/URL ends in `.svg` (case-insensitive), skip image and use `branding.site_name` text |
| Button radius | Map light default theme `radius` → pixel value; inject into shared email button styles |
| Radius map | `none`→`0`, `sm`→`6`, `md`→`8`, `default` (and unknown)→`24` (matches `--radius-3xl` fallback for `.rounded-button`) |
| Injection point | PHP builds shared branding props once; every React Email render merges them |
| Card / shell radius | Out of scope (buttons only this pass) |
| Brand color | Keep current email `brand` hex unless already themed elsewhere |

## Architecture

```
settings(branding.*) + css_themes.radius (light default)
        │
        v
EmailBrandingProps (PHP helper)
  { siteName, logoUrl?, buttonBorderRadiusPx }
        │
        v  merged into every render() props
ReactEmailRenderer → emails/_components/linket-shell (+ buttons)
```

### PHP — branding helper

- New small helper (e.g. `App\Mail\EmailBranding`) used by all call sites that already call `ReactEmailRenderer::render`, and by `mail:send-template-samples`.
- `logoUrl`: first non-empty of `branding.logo_dark`, `branding.logo_light`; normalize with existing media URL helpers; make absolute; reject `.svg`.
- `siteName`: `branding.site_name` (fallback `config('app.name')`).
- `buttonBorderRadiusPx`: from the default light theme’s `radius` column (same theme family bootstrap uses for light chrome); map as in Decisions; fallback `24`.

### React Email

- `LinketShell` accepts optional `logoUrl`, `siteName`, `buttonBorderRadiusPx`.
- Header: if `logoUrl`, render `<Img>` (max-height ~32px, width auto); else `<Text>` with `siteName`.
- Shared button class: replace `rounded-full` with inline `borderRadius: ${buttonBorderRadiusPx}px` (email-safe; Tailwind arbitrary radius is flaky in clients).
- Apply on every CTA (`password-reset`, `order-confirmation`, `linket-message`).

### Samples command

- Dry-run / send paths merge the same branding props so inbox QA matches production branding.

## Testing

- Unit: branding helper — preference order, SVG skip, absolute URL, radius map.
- Feature/unit: renderer/shell props include logo + radius when provided.
- Contract/DOM or snapshot light check on shell header + one button style.
- Manual: re-run `mail:send-template-samples` after deploy; confirm logo + non-pill buttons.

## Out of scope

- Changing admin logo upload formats or converting SVG → PNG at send time.
- Theming email brand/primary color from CSS theme tokens.
- Card/shell corner radius and dark-mode email chrome.
- Migrating non–React Email mailables.
