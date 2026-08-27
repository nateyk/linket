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

    expect(source).toContain("toast.danger('Unable to attach the uploaded video')");
    expect(source).toContain("toast.danger('Unable to attach the resource')");
    expect(source.match(/showToastOnRestrictionFail: true/g)).toHaveLength(2);
    expect(source.match(/showToastOnBackendError: true/g)).toHaveLength(2);
  });
});
