# My Portal — Downloads + Audio Library — Design

Date: 2026-10-23  
Status: approved via rollout (A then B; implement after lesson player chrome)  
Mode: **Operate**  
Visual reference: v0 `DownloadsSection` / `AudioSection`  
Isolation: no account-settings coupling

## Scope

**In**

- Restyle `?section=downloads` as pack articles (cover + title + file rows + download actions) using existing purchase/download APIs
- Restyle `?section=audio` to list audio-type purchases the same pack pattern (files as tracks); empty state when none
- Keep receipt/review on orders section (not required on pack cards for this slice)

**Out**

- Separate download/audio detail routes and full pack player page
- Fake BPM / local-only play without stream URLs
- New backend entitlements

## Behavior

- Downloads list = non-course, non-audio file purchases (existing filter minus `product_type === 'audio'`)
- Audio list = orders with `product_type === 'audio'`
- Download buttons call existing `onDownload` handlers
