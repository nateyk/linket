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
  return hasUnsavedEdits ? 'confirm-discard' : 'switch';
}
