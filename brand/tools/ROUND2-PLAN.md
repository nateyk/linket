# Round 2 plan — finish the drawing + production set

User rating 7.5/10: "the drawing is not finished yet". Directives:
- A + R1 + blue dot, no new ideas. No subagents. Only brand/. No commits.
- Fix k (chamfered arm) and e (flat cut) so the family reads like L/i.
- Prove spacing: 32px + squint, no pair may stand out.
- Small-size cut in the favicon; full joint at larger sizes; B = fallback if 16px fails.
- Deliver master (outlined, id="dot"), color versions + contrast table,
  CVD check, small sizes (honest 16px), favicon/app icons (white vs dark tile
  shown, one recommended, tab mockups light+dark), og 1200x630, usage note.
- STOP: file list, PNG paths, contrast table, problems.

## Steps
1. Baseline round-1 verification (analyze + sheets + verify) — GREEN.
2. Probe k junction, e junction, e aperture at 4x zoom (ascii + pixel probes).
3. Decide minimal refinements (systematic only), implement in build_wordmarks
   (outline ALL letters via engine, rj per variant), regenerate + diff vs round 1.
4. build_master.py -> master/linket-wordmark (+ small cut), color/ variants.
5. Contrast table (WCAG code) + CVD sims (protan/deutan/tritan) sheet.
6. Small-sizes sheet: 16/24/32/48 on white + dark, honest dot measurement.
7. build_icons.py -> Li crop, optical centering, tiles (white vs dark),
   favicon.svg/ico, apple-touch 180, 192/512, maskable (safe zone), og 1200x630.
8. Tab mockups light+dark x white/dark tile -> verdict from measurements.
9. Squint proof at 32px; context sheets rebuilt wordmark-only; archive symbols.
10. USAGE.md, REPORT.md update; full verification; STOP with deliverables.
