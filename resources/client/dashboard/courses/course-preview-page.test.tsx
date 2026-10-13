import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

describe('course preview page', () => {
  test('registers a human-readable owner preview route', () => {
    const routes = fs.readFileSync(
      path.resolve('resources/client/dashboard/dashboard-routes.tsx'),
      'utf8',
    );
    const builder = fs.readFileSync(
      path.resolve('resources/client/dashboard/courses/course-builder-page.tsx'),
      'utf8',
    );
    const preview = fs.readFileSync(
      path.resolve('resources/client/dashboard/courses/course-preview-page.tsx'),
      'utf8',
    );

    expect(routes).toContain("path: 'items/:productId/course/preview'");
    expect(builder).toContain('course/preview');
    expect(builder).not.toContain('/preview?preview=1');
    expect(preview).toContain('/api/v1/courses/${courseId}/preview');
    expect(preview).toContain('ProductCover');
    expect(preview).toContain('Preview mode');
    expect(preview).toContain('Course curriculum');
    expect(preview).toContain('max-w-3xl');
  });
});
