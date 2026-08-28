import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

describe('course builder uploads', () => {
  test('reports upload and attachment failures for lesson files', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/courses/course-builder-page.tsx',
      ),
      'utf8',
    );

    expect(source).toContain(
      "toast.danger('Unable to attach the uploaded video')",
    );
    expect(source).toContain("toast.danger('Unable to attach the resource')");
    expect(source.match(/showToastOnRestrictionFail: true/g)).toHaveLength(2);
    expect(source.match(/showToastOnBackendError: true/g)).toHaveLength(2);
  });
});

describe('course builder analytics navigation', () => {
  test('uses the Base UI render API for the analytics link', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/courses/course-builder-page.tsx',
      ),
      'utf8',
    );

    expect(source).toMatch(
      /render=\{\s*<Link\s+to=\{`\/dashboard\/my-products\/\$\{productId\}\/course\/analytics`\}\s*\/>\s*\}/,
    );
  });

  test('selects the requested lesson after loading its course', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/courses/course-builder-page.tsx',
      ),
      'utf8',
    );

    expect(source).toContain('useSearchParams');
    expect(source).toContain("searchParams.get('lessonId')");
    expect(source).toContain('requestedLesson');
  });
});

describe('course builder curriculum sorting', () => {
  test('removes the overview cards and persists chapter and lesson ordering', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/courses/course-builder-page.tsx',
      ),
      'utf8',
    );

    expect(source).not.toContain('<StatCard');
    expect(source).toContain('@ui/interactions/dnd/sortable/use-sortable');
    expect(source).toContain('/chapters/reorder');
    expect(source).toContain('/lessons/reorder');
  });
});
