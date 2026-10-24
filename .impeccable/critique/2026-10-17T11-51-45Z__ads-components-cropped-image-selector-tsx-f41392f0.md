---
target_identity: "file:/home/nate/projects/linket/common/foundation/resources/client/uploads/components/cropped-image-selector.tsx"
target_fingerprint: "sha256:774c7a7d446ad40d5ad642a0b593476e0213d5a10ebf3a18258351241eb7cc7c"
target_path: /home/nate/projects/linket/common/foundation/resources/client/uploads/components/cropped-image-selector.tsx
timestamp: 2026-10-17T11-51-45Z
slug: ads-components-cropped-image-selector-tsx-f41392f0
closed: true
---
Method: dual-agent (A: 10a1301f-de73-4078-bb46-d9ca594b0a93 · B: dec621ef-7e47-4a9e-bb92-d2d521db42ff)

## Design Health Score
**21/40 — Acceptable** (Operate). Detector clean (`[]`); defects are design-system / consistency, not mechanical.

## Design specificity
Half Linket (locked aspect, cropRadius, Trans, shadcn Dialog), half react-easy-crop sample chrome (white rim, black wash, generic title, marketing dropzone).

## Priority issues (P0–P3)
- **P1** Call-site fracture: label / cropRadius / density diverge across creator vs product vs course
- **P1** Crop stage sample chrome + token leaks (`bg-white/30`, stock crop CSS)
- **P1** CroppedAvatar forces `rounded-full` while storefront uses container radius
- **P2** Footer fights `Dialog.Footer` flex-col-reverse; hover-gated kebab on touch
- **P2** ImageCropApply/Reset raw `<button>` fallbacks
- **P3** Course size hint ≠ 16:9; dropzone copy drift vs image-selector

## Detector
Exit 0, zero findings. Browser: DDEV homepage only (no auth crop surface). Bypass: `image-selector-dialog.tsx` still raw Cropper (background tab; out of this polish scope).

## Strengths
Single CroppedImageSelector path; aspect discipline; Zoom labeled.
