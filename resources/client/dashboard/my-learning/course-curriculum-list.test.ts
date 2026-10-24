import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const source = fs.readFileSync(
  path.resolve(
    'resources/client/dashboard/my-learning/course-curriculum-list.tsx',
  ),
  'utf8',
);

describe('course curriculum list', () => {
  test('can hide redundant chapter headers', () => {
    expect(source).toContain('shouldShowChapterHeader');
    expect(source).toContain('courseTitle');
  });

  test('shows duration on the trailing edge of lesson rows', () => {
    expect(source).toContain('tabular-nums');
    expect(source).toContain('ml-auto');
  });
});
