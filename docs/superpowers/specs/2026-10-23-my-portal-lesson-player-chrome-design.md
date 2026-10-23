# My Portal — Lesson Player Chrome — Design

Date: 2026-10-23  
Status: approved in chat (depth 1 — visual chrome; keep existing APIs)  
Mode: **Operate** (buyer learning)  
Visual reference: v0 `components/portal/course-player.tsx` + `detail-header.tsx`  
Builds on: dashboard shell + courses list specs; access rules unchanged  
Next: Downloads + Audio (separate slice)

## 1. Intent

Restyle `/my-portal/courses/:courseId/lessons/:lessonId` to the v0 **detail header + stage + curriculum rail** composition while keeping real video, mark-complete, prev/next, quiz, and resource downloads.

## 2. Scope

**In**

- Detail header: back to `/my-portal?section=courses`, course title, progress from learn payload when available
- Main column: bordered video/readable stage (`LessonVideo` / existing content), lesson title, prev / Mark complete / next
- Tabs: Overview (summary/content) + Resources (existing file list + download). **No Notes tab**
- Right rail (~340px): existing curriculum list; mobile sheet for curriculum (keep current pattern)
- Isolation: no `@app/account-settings` imports; not nested under account-settings routes

**Out**

- Fake play overlay / elapsed scrubber / mock duration meter
- Notes UI
- Access/lifetime badges without real API fields
- Quiz behavior changes
- Downloads / audio library (next slice)

## 3. Approach

Refactor `lesson-player-page.tsx` layout (and small presentational helpers if needed) to match v0 grid. Reuse `CourseCurriculumList`, `LessonVideo`, `completePortalLesson` / fetch helpers. Prefer `MyPortalShell` or a slim course wrapper — do **not** force full `PortalLibraryLayout` sidebar on the player (focus is lesson chrome; back link returns to library courses section).

## 4. Layout

| Region | Content |
| --- | --- |
| Header | Back link “My courses” → `?section=courses`; course title; optional `Progress` for course % |
| Left | Aspect-video (or content card) stage; lesson meta + controls; Tabs Overview / Resources |
| Right | Curriculum list sticky on desktop; Sheet on small screens |

## 5. Testing

- Source/component tests: back href includes `section=courses`; no Notes tab; no account-settings imports
- Keep existing lesson/video tests green where applicable
- Build

## 6. Non-goals

No seller dashboard changes. No paste of v0 `components/ui/*`.
