export interface LessonDirtySnapshot {
  title: string;
  status: string;
  videoUrl: string;
  videoType: string | null;
  videoFileEntryId: number | null;
  content: string;
  contentType: string;
  resourceIds: number[];
  quizJson: string | null;
}

export function normalizeQuizForCompare(quiz: unknown): string | null {
  if (!quiz || typeof quiz !== 'object') return null;
  return JSON.stringify(quiz, (key, value) =>
    key === 'key' ? undefined : value,
  );
}

export function isLessonEditorDirty(
  current: LessonDirtySnapshot,
  original: LessonDirtySnapshot,
): boolean {
  return JSON.stringify(current) !== JSON.stringify(original);
}
