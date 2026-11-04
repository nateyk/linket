export type LessonNavigationDecision = 'resume' | 'confirm-discard' | 'switch';

/**
 * Returning to the active lesson is not a lesson switch: preserve its mounted
 * editor state even if that lesson contains unsaved changes.
 */
export function resolveLessonNavigation(
  currentLessonId: number | null,
  targetLessonId: number,
  hasUnsavedEdits: boolean,
): LessonNavigationDecision {
  if (currentLessonId === targetLessonId) return 'resume';
  // With no active lesson there are no mounted edits to discard.
  if (currentLessonId === null) return 'switch';
  return hasUnsavedEdits ? 'confirm-discard' : 'switch';
}

/** Keep the active lesson in view after saving, with an initial deep-link
 * fallback. Never select a removed lesson when the curriculum is reloaded. */
export function chooseLessonAfterReload<TLesson extends {id: number}>(
  chapters: Array<{id: number; lessons: TLesson[]}>,
  currentLessonId: number | null,
  requestedLessonId: number | null,
): {chapterId: number; lesson: TLesson} | null {
  const lookup = (lessonId: number | null) => {
    if (lessonId === null) return null;
    for (const chapter of chapters) {
      const lesson = chapter.lessons.find(item => item.id === lessonId);
      if (lesson) return {chapterId: chapter.id, lesson};
    }
    return null;
  };

  const current = lookup(currentLessonId);
  if (current) return current;

  const requested = lookup(requestedLessonId);
  if (requested) return requested;

  for (const chapter of chapters) {
    if (chapter.lessons.length) {
      return {chapterId: chapter.id, lesson: chapter.lessons[0]};
    }
  }
  return null;
}
