import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

describe('course creation page', () => {
  test('shows inline validation and labels the primary action as creation', () => {
    const source = fs.readFileSync(
      path.resolve('resources/client/dashboard/courses/create-course-page.tsx'),
      'utf8',
    );

    expect(source).toContain('data-invalid={!!error}');
    expect(source).toContain('aria-invalid={!!error}');
    expect(source).toContain("creating ? 'Creating course...' : 'Create course'");
  });
});
