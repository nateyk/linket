import {describe, expect, test} from 'vitest';
import {chooseLessonAfterReload, resolveLessonNavigation} from './course-lesson-navigation';

describe('course lesson mobile navigation decisions', () => {
  test('resuming the same lesson never discards its unsaved edits', () => {
    expect(resolveLessonNavigation(42, 42, true)).toBe('resume');
    expect(resolveLessonNavigation(42, 42, false)).toBe('resume');
  });

  test('opening a different lesson asks to discard only when the active one has edits', () => {
    expect(resolveLessonNavigation(42, 43, true)).toBe('confirm-discard');
    expect(resolveLessonNavigation(42, 43, false)).toBe('switch');
  });

  test('the first lesson can be opened without an unnecessary confirmation', () => {
    expect(resolveLessonNavigation(null, 42, true)).toBe('switch');
  });
});

describe('preserve Course builder lesson selection on reloading saved data', () => {
  const chapters = [
    {id: 10, lessons: [{id: 101, title: 'Introduction'}]},
    {id: 20, lessons: [{id: 201, title: 'Camera basics'}, {id: 202, title: 'Editing'}]},
  ];

  test('keeps the current edited lesson rather than jumping to the first lesson after save', () => {
    expect(chooseLessonAfterReload(chapters, 202, null)).toEqual({
      chapterId: 20,
      lesson: {id: 202, title: 'Editing'},
    });
  });

  test('honors deep links on initial load when no lesson is active', () => {
    expect(chooseLessonAfterReload(chapters, null, 201)).toEqual({
      chapterId: 20,
      lesson: {id: 201, title: 'Camera basics'},
    });
  });

  test('does not replace the current lesson with an old deep link after editing another lesson', () => {
    expect(chooseLessonAfterReload(chapters, 202, 101)).toEqual({
      chapterId: 20,
      lesson: {id: 202, title: 'Editing'},
    });
  });

  test('falls back safely if current lesson was removed', () => {
    expect(chooseLessonAfterReload(chapters, 999, null)).toEqual({
      chapterId: 10,
      lesson: {id: 101, title: 'Introduction'},
    });
  });

  test('uses first available lesson when earliest chapter is empty', () => {
    expect(chooseLessonAfterReload([{id: 10, lessons: []}, chapters[1]], null, null)).toEqual({
      chapterId: 20,
      lesson: {id: 201, title: 'Camera basics'},
    });
  });

  test('does not select a deleted lesson when all chapters are empty', () => {
    expect(chooseLessonAfterReload([{id: 10, lessons: []}], 101, null)).toBeNull();
  });
});
