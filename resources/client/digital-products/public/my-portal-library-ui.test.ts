import {describe, expect, test} from 'vitest';
import {
  courseLessonsDone,
  estimateLessonsDone,
  type PortalCourse,
} from './my-portal-library-ui';

describe('estimateLessonsDone', () => {
  test('returns 0 when percent or total is 0', () => {
    expect(estimateLessonsDone(0, 10)).toBe(0);
    expect(estimateLessonsDone(50, 0)).toBe(0);
  });

  test('rounds percent of total and clamps to total', () => {
    expect(estimateLessonsDone(50, 10)).toBe(5);
    expect(estimateLessonsDone(100, 8)).toBe(8);
    expect(estimateLessonsDone(33, 3)).toBe(1);
  });
});

describe('courseLessonsDone', () => {
  const base: PortalCourse = {
    course_id: 1,
    title: 'Test',
    total_lessons: 10,
    percent: 50,
  };

  test('prefers lessons_done from the API', () => {
    expect(courseLessonsDone({...base, lessons_done: 3})).toBe(3);
  });

  test('falls back to completed then estimate', () => {
    expect(courseLessonsDone({...base, completed: 4})).toBe(4);
    expect(courseLessonsDone(base)).toBe(5);
  });
});

describe('portal course card enrichment', () => {
  test('library UI renders creator and next lesson copy', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/digital-products/public/my-portal-library-ui.tsx',
      ),
      'utf8',
    );
    expect(source).toContain('creator_name');
    expect(source).toContain('next_lesson_title');
    expect(source).toContain('courseLessonsDone');
    expect(source).toContain('Up next: :title');
    expect(source).toContain('by :name');
  });
});
