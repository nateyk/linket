import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const source = fs.readFileSync(
  path.resolve('resources/client/dashboard/courses/course-builder-page.tsx'),
  'utf8',
);

describe('course move', () => {
  test('requires an explicit destination outside the source chapter', () => {
    expect(source).toContain('MoveLessonDialog');
    expect(source).toContain(
      'chapter => chapter.id !== sourceChapter.id',
    );
    expect(source).toContain('value={\n                  targetChapterId === null');
    expect(source).toContain('if (targetChapterId === null || moving) return;');
    expect(source).toContain('disabled={targetChapterId === null || moving}');
  });

  test('optimistically moves and reindexes lessons in both chapters', () => {
    expect(source).toContain(
      '.filter(item => item.id !== lessonId)\n            .map((item, sortOrder) => ({...item, sort_order: sortOrder}))',
    );
    expect(source).toContain('{...lesson, chapter_id: targetChapterId}');
    expect(source).toContain(
      '].map((item, sortOrder) => ({...item, sort_order: sortOrder}))',
    );
    expect(source).toContain('moveLessonInCourse(\n            current,');
  });

  test('posts the selected destination and restores the exact course on failure', () => {
    expect(source).toContain('const previousCourse = course;');
    expect(source).toContain(
      'await apiClient.post(`/api/v1/course-lessons/${lesson.id}/move`, {\n        target_chapter_id: targetChapterId,\n        position: 0,\n      })',
    );
    expect(source).toContain('setCourse(previousCourse);');
    expect(source).toContain(
      "toast.danger(e?.message ?? 'Unable to move lesson')",
    );
  });
});
