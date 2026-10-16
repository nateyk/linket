# Lesson Video Player Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Play uploaded lesson videos with a shadcn-styled `media-chrome` Video Player, and play YouTube/Vimeo via privacy-hardened embeds with an honest builder warning (policy B).

**Architecture:** Thin React wrappers around `media-chrome/react`. A `LessonVideo` router chooses file player vs embed. PHP `VideoUrlNormalizer` emits `youtube-nocookie` embed URLs with privacy query params. Course builder warns that host embeds can be shared outside Linket.

**Tech Stack:** React 19, `media-chrome`, Tailwind 4 semantic tokens, Laravel 12 / Pest, Vitest

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-17-lesson-video-player-design.md`
- Policy B: allow YouTube/Vimeo; warn; prefer upload for protected playback
- Visible copy uses `<Trans message="..." />` with static `message` strings
- Style with semantic tokens only (`bg-muted`, `border-border`, etc.)
- Do not add a second component system beyond shadcn + this thin media-chrome wrapper
- Do not claim YouTube Share chrome can be fully removed
- Run PHP via `ddev artisan`; frontend tests via `npm run test`
- Commits only when the user explicitly asks

---

## File map

| Path | Role |
|------|------|
| `resources/client/courses/video-player/video-player.tsx` | Composable VideoPlayer exports |
| `resources/client/courses/video-player/video-player.css` | media-chrome CSS variables → Linket tokens |
| `resources/client/dashboard/my-learning/lesson-video.tsx` | Source router + privacy iframe |
| `resources/client/dashboard/my-learning/lesson-video.test.tsx` | Vitest for router / embed URL / no share chrome |
| `resources/client/dashboard/my-learning/lesson-player-page.tsx` | Wire `LessonVideo` |
| `resources/client/dashboard/courses/course-builder-page.tsx` | Upload-first + warning copy |
| `app/Courses/Services/VideoUrlNormalizer.php` | nocookie + query params |
| `tests/Unit/Courses/VideoUrlNormalizerTest.php` | Pest for normalizer |

---

### Task 1: Add `media-chrome` dependency

**Files:**
- Modify: `package.json` / lockfile via npm

**Interfaces:**
- Produces: `media-chrome` and `media-chrome/react` importable

- [ ] **Step 1: Install package**

```bash
npm install media-chrome --save
```

Expected: `media-chrome` listed under `dependencies` in `package.json`.

- [ ] **Step 2: Verify import resolves**

```bash
node -e "require.resolve('media-chrome/react')"
```

Expected: prints a path under `node_modules/media-chrome/...` with no throw.

---

### Task 2: Video Player primitives (media-chrome wrappers)

**Files:**
- Create: `resources/client/courses/video-player/video-player.css`
- Create: `resources/client/courses/video-player/video-player.tsx`
- Test: covered indirectly by Task 4

**Interfaces:**
- Produces:
  - `VideoPlayer` — root `MediaController` with className
  - `VideoPlayerContent` — `<video slot="media" />` props
  - `VideoPlayerControlBar`, `VideoPlayerPlayButton`, `VideoPlayerSeekBackwardButton`, `VideoPlayerSeekForwardButton`, `VideoPlayerTimeRange`, `VideoPlayerTimeDisplay`, `VideoPlayerMuteButton`, `VideoPlayerVolumeRange`

- [ ] **Step 1: Add CSS token bridge**

Create `resources/client/courses/video-player/video-player.css`:

```css
.video-player-root {
  --media-primary-color: var(--primary);
  --media-secondary-color: var(--background);
  --media-control-background: color-mix(in oklab, var(--background) 85%, transparent);
  --media-control-hover-background: color-mix(in oklab, var(--muted) 90%, transparent);
  --media-range-bar-color: var(--primary);
  --media-font: inherit;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: var(--radius-card, 0.75rem);
  border: 1px solid var(--border);
  background: var(--muted);
}

.video-player-root video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
}
```

- [ ] **Step 2: Implement wrappers**

Create `resources/client/courses/video-player/video-player.tsx`:

```tsx
'use client';

import {
  MediaController,
  MediaControlBar,
  MediaTimeRange,
  MediaTimeDisplay,
  MediaVolumeRange,
  MediaPlayButton,
  MediaSeekBackwardButton,
  MediaSeekForwardButton,
  MediaMuteButton,
} from 'media-chrome/react';
import {cn} from '@ui/utils/cn';
import type {ComponentProps, VideoHTMLAttributes} from 'react';
import './video-player.css';

export function VideoPlayer({
  className,
  ...props
}: ComponentProps<typeof MediaController>) {
  return (
    <MediaController
      className={cn('video-player-root', className)}
      {...props}
    />
  );
}

export function VideoPlayerContent({
  className,
  ...props
}: VideoHTMLAttributes<HTMLVideoElement>) {
  return (
    <video
      slot="media"
      className={cn(className)}
      playsInline
      {...props}
    />
  );
}

export function VideoPlayerControlBar(
  props: ComponentProps<typeof MediaControlBar>,
) {
  return <MediaControlBar {...props} />;
}

export function VideoPlayerPlayButton(
  props: ComponentProps<typeof MediaPlayButton>,
) {
  return <MediaPlayButton {...props} />;
}

export function VideoPlayerSeekBackwardButton(
  props: ComponentProps<typeof MediaSeekBackwardButton>,
) {
  return <MediaSeekBackwardButton seekOffset={10} {...props} />;
}

export function VideoPlayerSeekForwardButton(
  props: ComponentProps<typeof MediaSeekForwardButton>,
) {
  return <MediaSeekForwardButton seekOffset={10} {...props} />;
}

export function VideoPlayerTimeRange(
  props: ComponentProps<typeof MediaTimeRange>,
) {
  return <MediaTimeRange {...props} />;
}

export function VideoPlayerTimeDisplay(
  props: ComponentProps<typeof MediaTimeDisplay>,
) {
  return <MediaTimeDisplay {...props} />;
}

export function VideoPlayerMuteButton(
  props: ComponentProps<typeof MediaMuteButton>,
) {
  return <MediaMuteButton {...props} />;
}

export function VideoPlayerVolumeRange(
  props: ComponentProps<typeof MediaVolumeRange>,
) {
  return <MediaVolumeRange {...props} />;
}
```

- [ ] **Step 3: Typecheck import path**

Ensure `tsconfig` / Vite can resolve `media-chrome/react`. If build fails on CSS import, keep the CSS import (Vite supports it) or move token rules into `common-tailwind.css` only if required.

---

### Task 3: Privacy embed URL helpers + PHP normalizer

**Files:**
- Create: `tests/Unit/Courses/VideoUrlNormalizerTest.php`
- Modify: `app/Courses/Services/VideoUrlNormalizer.php`
- Create: helper inside `lesson-video.tsx` or `resources/client/courses/video-player/privacy-embed-url.ts`

**Interfaces:**
- Produces:
  - PHP: `VideoUrlNormalizer::normalize(?string $url): ?string` → YouTube returns `https://www.youtube-nocookie.com/embed/{id}?modestbranding=1&rel=0&playsinline=1`
  - TS: `buildPrivacyEmbedUrl(src: string): string` — if already embed/nocookie, ensure privacy params; used when API returns legacy `youtube.com/embed` rows

- [ ] **Step 1: Write failing Pest test**

```php
<?php

use App\Courses\Services\VideoUrlNormalizer;

it('normalizes youtube watch urls to youtube-nocookie embeds with privacy params', function () {
    $url = VideoUrlNormalizer::normalize('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

    expect($url)->toStartWith('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
        ->and($url)->toContain('modestbranding=1')
        ->and($url)->toContain('rel=0')
        ->and($url)->toContain('playsinline=1');
});

it('normalizes vimeo urls to player embeds', function () {
    $url = VideoUrlNormalizer::normalize('https://vimeo.com/123456789');

    expect($url)->toStartWith('https://player.vimeo.com/video/123456789');
});
```

- [ ] **Step 2: Run Pest — expect FAIL**

```bash
ddev artisan test --compact tests/Unit/Courses/VideoUrlNormalizerTest.php
```

Expected: FAIL (still returns `youtube.com/embed/...` without params).

- [ ] **Step 3: Update normalizer**

In `VideoUrlNormalizer.php`, change YouTube return to:

```php
return 'https://www.youtube-nocookie.com/embed/' . $youtube
    . '?modestbranding=1&rel=0&playsinline=1';
```

Optionally append Vimeo query: `?title=0&byline=0&portrait=0`.

- [ ] **Step 4: Run Pest — expect PASS**

```bash
ddev artisan test --compact tests/Unit/Courses/VideoUrlNormalizerTest.php
```

- [ ] **Step 5: Add TS helper** `resources/client/courses/video-player/privacy-embed-url.ts`

```ts
export function buildPrivacyEmbedUrl(src: string): string {
  try {
    const url = new URL(src);
    const host = url.hostname.replace(/^www\./, '');
    const ytMatch =
      host.includes('youtube.com') || host.includes('youtube-nocookie.com')
        ? url.pathname.match(/\/embed\/([A-Za-z0-9_-]{6,})/)
        : host === 'youtu.be'
          ? url.pathname.match(/^\/([A-Za-z0-9_-]{6,})/)
          : null;
    if (ytMatch?.[1]) {
      const out = new URL(
        `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`,
      );
      out.searchParams.set('modestbranding', '1');
      out.searchParams.set('rel', '0');
      out.searchParams.set('playsinline', '1');
      return out.toString();
    }
    if (host.includes('vimeo.com')) {
      const id = url.pathname.match(/\/(?:video\/)?(\d+)/)?.[1];
      if (id) {
        const out = new URL(`https://player.vimeo.com/video/${id}`);
        out.searchParams.set('title', '0');
        out.searchParams.set('byline', '0');
        out.searchParams.set('portrait', '0');
        return out.toString();
      }
    }
  } catch {
    // fall through
  }
  return src;
}
```

---

### Task 4: `LessonVideo` router + Vitest

**Files:**
- Create: `resources/client/dashboard/my-learning/lesson-video.tsx`
- Create: `resources/client/dashboard/my-learning/lesson-video.test.tsx`

**Interfaces:**
- Consumes: VideoPlayer exports, `buildPrivacyEmbedUrl`
- Produces: `LessonVideo({ title, videoUrl?, fileUrl? }: { title: string; videoUrl?: string | null; fileUrl?: string | null })`

Priority: **fileUrl wins** when both present (upload preferred over embed).

- [ ] **Step 1: Write failing Vitest (string/source assertions on helpers + component module)**

```tsx
import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';
import {buildPrivacyEmbedUrl} from '@app/courses/video-player/privacy-embed-url';

describe('buildPrivacyEmbedUrl', () => {
  test('rewrites youtube embed to nocookie with privacy params', () => {
    const url = buildPrivacyEmbedUrl(
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    );
    expect(url).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(url).toContain('modestbranding=1');
    expect(url).toContain('rel=0');
  });
});

describe('LessonVideo module', () => {
  const source = fs.readFileSync(
    path.resolve('resources/client/dashboard/my-learning/lesson-video.tsx'),
    'utf8',
  );

  test('uses media-chrome VideoPlayer for files and privacy iframe for hosts', () => {
    expect(source).toContain('VideoPlayerContent');
    expect(source).toContain('buildPrivacyEmbedUrl');
    expect(source).not.toContain('Watch on YouTube');
    expect(source).not.toContain('youtu.be/');
  });
});
```

- [ ] **Step 2: Run Vitest — expect FAIL**

```bash
npm run test -- --run resources/client/dashboard/my-learning/lesson-video.test.tsx
```

- [ ] **Step 3: Implement `LessonVideo`**

```tsx
import {
  VideoPlayer,
  VideoPlayerContent,
  VideoPlayerControlBar,
  VideoPlayerMuteButton,
  VideoPlayerPlayButton,
  VideoPlayerSeekBackwardButton,
  VideoPlayerSeekForwardButton,
  VideoPlayerTimeDisplay,
  VideoPlayerTimeRange,
  VideoPlayerVolumeRange,
} from '@app/courses/video-player/video-player';
import {buildPrivacyEmbedUrl} from '@app/courses/video-player/privacy-embed-url';
import {Trans} from '@ui/i18n/trans';

export function LessonVideo({
  title,
  videoUrl,
  fileUrl,
}: {
  title: string;
  videoUrl?: string | null;
  fileUrl?: string | null;
}) {
  if (fileUrl) {
    return (
      <VideoPlayer>
        <VideoPlayerContent src={fileUrl} preload="metadata" />
        <VideoPlayerControlBar>
          <VideoPlayerPlayButton />
          <VideoPlayerSeekBackwardButton />
          <VideoPlayerSeekForwardButton />
          <VideoPlayerTimeRange />
          <VideoPlayerTimeDisplay showDuration />
          <VideoPlayerMuteButton />
          <VideoPlayerVolumeRange />
        </VideoPlayerControlBar>
      </VideoPlayer>
    );
  }

  if (videoUrl) {
    // Host iframe chrome (Share / Watch on YouTube) is outside Linket control.
    const src = buildPrivacyEmbedUrl(videoUrl);
    return (
      <div className="aspect-video overflow-hidden rounded-card border border-border bg-muted">
        <iframe
          src={src}
          className="size-full"
          allowFullScreen
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }

  return (
    <div className="flex aspect-video items-center justify-center rounded-card border border-border bg-muted text-sm text-muted-foreground">
      <Trans message="No video available for this lesson." />
    </div>
  );
}
```

- [ ] **Step 4: Run Vitest — expect PASS**

```bash
npm run test -- --run resources/client/dashboard/my-learning/lesson-video.test.tsx
```

---

### Task 5: Wire lesson player page

**Files:**
- Modify: `resources/client/dashboard/my-learning/lesson-player-page.tsx` (video block ~446–466)

**Interfaces:**
- Consumes: `LessonVideo`

- [ ] **Step 1: Replace iframe/video block**

Replace the `lesson.content_type === 'video'` media branch with:

```tsx
{lesson.content_type === 'video' ? (
  <>
    <LessonVideo
      title={lesson.title}
      videoUrl={lesson.video_url}
      fileUrl={lesson.video?.url}
    />
    {/* existing Tabs.Root for Summary / Attachments / Quiz unchanged */}
```

Remove the separate `iframe` and bare `<video controls>` blocks.

- [ ] **Step 2: Confirm no leftover raw players**

```bash
rg -n "iframe|video controls" resources/client/dashboard/my-learning/lesson-player-page.tsx
```

Expected: no lesson media iframe/video controls (Tabs may remain).

- [ ] **Step 3: Smoke Vitest if page has source tests; else skip**

---

### Task 6: Course builder warning (policy B)

**Files:**
- Modify: `resources/client/dashboard/courses/course-builder-page.tsx` (video URL field ~1933–1956)

**Interfaces:**
- Produces: static Trans warning near URL field

- [ ] **Step 1: Update card description + field warning**

Near the YouTube/Vimeo input, ensure copy includes:

```tsx
<Alert fillStyle="subtleFill">
  <Alert.Description>
    <Trans message="YouTube and Vimeo embeds can be opened or shared outside Linket. Upload a video file for playback that stays inside your store." />
  </Alert.Description>
</Alert>
```

Prefer upload control visually above the URL field. Keep existing save payload behavior.

- [ ] **Step 2: Assert warning string**

Add to an existing Vitest or a tiny source test:

```ts
expect(builderSource).toContain(
  'YouTube and Vimeo embeds can be opened or shared outside Linket',
);
```

---

### Task 7: Verification

- [ ] **Step 1: Pest**

```bash
ddev artisan test --compact tests/Unit/Courses/VideoUrlNormalizerTest.php
```

Expected: PASS

- [ ] **Step 2: Vitest**

```bash
npm run test -- --run resources/client/dashboard/my-learning/lesson-video.test.tsx
```

Expected: PASS

- [ ] **Step 3: Lint touched files**

```bash
npm run lint -- resources/client/courses/video-player resources/client/dashboard/my-learning/lesson-video.tsx resources/client/dashboard/my-learning/lesson-player-page.tsx
```

Expected: no new errors in touched files.

- [ ] **Step 4: Manual check (operator)**

- Open a lesson with uploaded video → custom control bar, no YouTube share UI.
- Open a lesson with YouTube URL → nocookie embed; Linket adds no “Watch on YouTube” link.
- Open course builder video section → warning visible.

---

## Spec coverage checklist

| Spec item | Task |
|-----------|------|
| media-chrome Video Player | 1–2 |
| LessonVideo router | 4–5 |
| youtube-nocookie + params | 3 |
| Builder warning | 6 |
| Keep Summary/Attachments tabs | 5 (tabs unchanged) |
| Tests | 3, 4, 7 |
| No fake “fully locked YouTube” | Global + iframe comment in Task 4 |

## Placeholder scan

None intentional. Commit steps omitted (user asks before commits).
