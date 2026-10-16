# Lesson Video Player Design

**Date:** 2026-10-17  
**Status:** Approved in conversation (Approach 1 + policy B)  
**Surfaces:** `/my-portal` lesson player, my-learning lesson player, course builder

## Goal

Replace raw YouTube iframes and naked `<video controls>` in lesson playback with:

1. A composable, shadcn-styled **Video Player** built on `media-chrome` for uploaded / hosted files.
2. A **source router** that chooses the right playback surface.
3. Honest handling of YouTube/Vimeo: privacy-hardened embeds + builder warning that host players can still be shared outside Linket.

## Non-goals

- Fully removing YouTube’s native Share / “Watch on YouTube” chrome (impossible inside their iframe).
- Blocking YouTube/Vimeo URLs in the builder (policy C — deferred).
- Replacing the existing `@common/player` stack app-wide (only lesson course playback for now).
- DRM / watermarking / download prevention beyond what the host already provides.

## Policy (B)

| Source | Playback | Protection messaging |
|--------|----------|----------------------|
| Uploaded file (`lesson.video.url`) | Custom `media-chrome` Video Player | Best path for storefront-protected content |
| YouTube / Vimeo (`lesson.video_url`) | Privacy-hardened embed iframe | Allowed; builder warns embeds can be shared outside Linket |

## Architecture

```
LessonVideo
├── if video.url (file)     → VideoPlayer (media-chrome)
└── if video_url (YT/Vimeo) → PrivacyEmbed (nocookie + params)
```

### Components

| Unit | Responsibility |
|------|----------------|
| `video-player/*` | Thin React wrappers around `media-chrome` web components (Root, Content, ControlBar, Play, Seek±, TimeRange, TimeDisplay, Mute, VolumeRange) |
| `LessonVideo` | Picks file vs embed; shared by portal + my-learning lesson pages |
| `VideoUrlNormalizer` (PHP) | Continue allowlisting YT/Vimeo; emit `youtube-nocookie` embed base + privacy query params |
| Course builder copy | Prefer upload; warn on URL paste |

### File placement (proposed)

- Frontend player: `resources/client/courses/video-player/` (or under `common/foundation/.../shadcn` if we treat it as shared UI — prefer app course domain first)
- Router: `resources/client/dashboard/my-learning/lesson-video.tsx` (imported by both lesson players)
- Builder warning: `resources/client/dashboard/courses/course-builder-page.tsx`
- Normalizer: `app/Courses/Services/VideoUrlNormalizer.php`

## Playback details

### Uploaded / hosted file

- Use `<VideoPlayer>` + `<VideoPlayerContent src={url} slot="media" preload="metadata" />` and control bar matching the kibo-ui example.
- Aspect-video container, rounded border, semantic tokens only.
- No “Watch on YouTube” / share affordances added by Linket.

### YouTube / Vimeo embed

- Never pass raw watch URLs into an iframe.
- YouTube: `https://www.youtube-nocookie.com/embed/{id}?modestbranding=1&rel=0&playsinline=1`
- Vimeo: keep `https://player.vimeo.com/video/{id}` (optionally `?title=0&byline=0&portrait=0` if compatible)
- Title attribute = lesson title; `allowFullScreen` retained.
- Document in code comment: host chrome (Share, etc.) is outside our control.

## Course builder

- Keep upload + URL fields.
- Near YouTube/Vimeo input, show warning via `<Trans>`:

  > YouTube and Vimeo embeds can be opened or shared outside Linket. Upload a video file for playback that stays inside your store.

- Prefer upload as primary CTA; URL as secondary.

## Lesson UI

- Keep existing Summary / Attachments (/ Quiz) tabs under the player.
- Swap iframe / native video blocks for `<LessonVideo />` only — no IA redesign in this change.

## Dependencies

- Add `media-chrome` (npm). Do not add a second component system beyond shadcn + this thin wrapper.

## Testing

- Vitest (source/string or unit):
  - `LessonVideo` / helper selects file player when `video.url` present.
  - YouTube embed URL uses `youtube-nocookie.com` and privacy params.
  - Linket does not render “Watch on YouTube” / share links of its own.
- Builder: warning message string present near URL field.
- PHP (Pest) if normalizer output changes: YouTube → nocookie embed with expected query string.

## Rollout

1. Add dependency + Video Player primitives.
2. Add `LessonVideo` + wire my-learning + my-portal lesson pages.
3. Update `VideoUrlNormalizer` + Pest.
4. Builder warning copy.
5. Focused Vitest + Pest.

## Open follow-ups (out of scope)

- Policy C: disallow YouTube in paid portal playback.
- Mux / HLS adaptive streaming controls.
- Storybook stories for Video Player (when Storybook MCP is up).
