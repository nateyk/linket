import {describe, expect, test} from 'vitest';
import {resolveLessonNavigation} from './course-lesson-navigation';

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
