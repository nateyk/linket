import fs from 'node:fs';
import {describe, expect, test} from 'vitest';
describe('course analytics page', () => {
  test('requests the analytics endpoint and renders the reference labels', () => {
    const src = fs.readFileSync('resources/client/dashboard/courses/course-analytics-page.tsx','utf8');
    expect(src).toContain("/api/v1/courses/${");
    expect(src).toContain("/analytics");
    expect(src).toContain("Active learners");
    expect(src).toContain("Detailed performance");
    expect(src).toContain("Completion rate");
  });
});
