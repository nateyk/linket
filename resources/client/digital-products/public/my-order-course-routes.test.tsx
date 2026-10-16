import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

describe('my order course access', () => {
  test('mounts course learning under my-order only', () => {
    const router = fs.readFileSync(
      path.resolve('resources/client/app-router.tsx'),
      'utf8',
    );
    const orderPage = fs.readFileSync(
      path.resolve(
        'resources/client/digital-products/public/order-lookup-page.tsx',
      ),
      'utf8',
    );
    const lessonPage = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/my-learning/lesson-player-page.tsx',
      ),
      'utf8',
    );
    const coursePage = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/my-learning/course-learn-page.tsx',
      ),
      'utf8',
    );
    const sidebar = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/layout/sidenav/app-dashboard-sidebar.tsx',
      ),
      'utf8',
    );

    expect(router).toContain("path: 'my-order/courses/:courseId'");
    expect(router).toContain(
      "path: 'my-order/courses/:courseId/lessons/:lessonId'",
    );
    expect(orderPage).not.toContain('/dashboard/my-courses');
    expect(orderPage).not.toContain('/dashboard/learn/');
    expect(lessonPage).toContain("setError('Unable to load this lesson.')");
    expect(lessonPage).toContain('const controller = new AbortController();');
    expect(lessonPage).toContain('setTrial(false);');
    expect(lessonPage).not.toContain('else await load();');
    expect(lessonPage).toContain(
      'else navigate(`/my-order/courses/${courseId}`);',
    );
    expect(coursePage).toContain("setError('Unable to load this course.')");
    expect(coursePage).toContain('const controller = new AbortController();');
    expect(coursePage).toContain('setCourse(null);');
    expect(coursePage).toContain('setLoading(true);');
    expect(coursePage).toContain('setError(undefined);');
    expect(coursePage).toContain('return () => controller.abort();');
    expect(coursePage).toMatch(
      /await apiClient\.get\(\s*`\/api\/v1\/courses\/\$\{courseId\}\/learn`\s*,\s*\{signal: controller\.signal\}\s*,?\s*\)/,
    );
    expect(lessonPage).toMatch(
      /await apiClient\.get\(\s*`\/api\/v1\/courses\/\$\{courseId\}\/learn\/lessons\/\$\{lessonId\}`\s*,\s*\{signal\}\s*,?\s*\)/,
    );
    expect(lessonPage).toContain(
      'isAxiosError(reason) && reason.response?.status === 403',
    );
    expect(orderPage).toMatch(
      /await apiClient\.get\(\s*'\/api\/v1\/my-courses'\s*,?\s*\)/,
    );
    expect(orderPage).toContain(
      '<Trans message="Unable to load your courses." />',
    );
    expect(sidebar).toContain(
      "filter={item => item.action !== '/dashboard/my-courses'}",
    );
  });
});
