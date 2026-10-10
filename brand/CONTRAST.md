# Linket wordmark - WCAG contrast (computed)

Ratios from WCAG 2.1 relative luminance, computed in `tools/build_round2.py` (no hand math). WCAG exempts logos, but the ratios are still reported so every version clears the bar it claims to clear.

| element | fg | bg | ratio | needs | version |
|---|---|---|---|---|---|
| letters | `#0a0a0a` | `#ffffff` | **19.80:1** | text 4.5 / graphics 3 | AAA text, pass graphics |
| dot | `#0049cc` | `#ffffff` | **7.43:1** | graphics 3 | pass graphics |
| letters | `#ffffff` | `#0a0a0a` | **19.80:1** | text 4.5 / graphics 3 | AAA text, pass graphics |
| dot (lifted) | `#0050de` | `#0a0a0a` | **3.02:1** | graphics 3 | pass graphics |
| letters + dot | `#0a0a0a` | `#ffffff` | **19.80:1** | text 4.5 / graphics 3 | AAA text, pass graphics |
| letters + dot | `#ffffff` | `#0a0a0a` | **19.80:1** | text 4.5 / graphics 3 | AAA text, pass graphics |
| letters + dot | `#ffffff` | `#0049cc` | **7.43:1** | text 4.5 / graphics 3 | AAA text, pass graphics |
| UI text (app fg) | `#212121` | `#ffffff` | **16.10:1** | reference | reference |
| dot vs letters (light) | `#0049cc` | `#0a0a0a` | **2.66:1** | logo-adjacent, no WCAG min | reference |
| favicon white tile: letters | `#0a0a0a` | `#ffffff` | **19.80:1** | graphics 3 | pass graphics |
| favicon white tile: dot | `#0049cc` | `#ffffff` | **7.43:1** | graphics 3 | pass graphics |
| favicon dark tile: letters | `#ffffff` | `#0a0a0a` | **19.80:1** | graphics 3 | pass graphics |
| favicon dark tile: dot (lifted) | `#0050de` | `#0a0a0a` | **3.02:1** | graphics 3 | pass graphics |

Dark-ground blue: `#0049cc` (HSL H/S kept, L 40%) was lifted to `#0050de` at the same hue and saturation until it reached 3:1 on `#0a0a0a` - same brand blue, only as light as legibility requires.
