import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

describe('my portal course access', () => {
  test('mounts course learning under my-portal with guest portal APIs', () => {
    const router = fs.readFileSync(
      path.resolve('resources/client/app-router.tsx'),
      'utf8',
    );
    const orderPage = fs.readFileSync(
      path.resolve(
        'resources/client/digital-products/public/my-portal-library.tsx',
      ),
      'utf8',
    );
    const orderEntry = fs.readFileSync(
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

    expect(router).toContain("path: 'my-portal/courses/:courseId'");
    expect(router).toContain(
      "path: 'my-portal/courses/:courseId/lessons/:lessonId'",
    );
    expect(orderPage).not.toContain('/dashboard/my-courses');
    expect(orderPage).not.toContain('/dashboard/learn/');
    expect(lessonPage).toContain("setError('Unable to load this lesson.')");
    expect(lessonPage).toContain('const controller = new AbortController();');
    expect(lessonPage).toContain('setTrial(false);');
    expect(lessonPage).not.toContain('else await load();');
    expect(lessonPage).toContain(
      'else navigate(`/my-portal/courses/${courseId}`);',
    );
    expect(coursePage).toContain("setError('Unable to load this course.')");
    expect(coursePage).toContain('const controller = new AbortController();');
    expect(coursePage).toContain('setCourse(null);');
    expect(coursePage).toContain('setLoading(true);');
    expect(coursePage).toContain('setError(undefined);');
    expect(coursePage).toContain('return () => controller.abort();');
    const portalApi = fs.readFileSync(
      path.resolve(
        'resources/client/digital-products/public/my-portal-api.ts',
      ),
      'utf8',
    );
    expect(portalApi).toContain('/api/v1/public/my-portal/courses/');
    expect(coursePage).toContain('fetchPortalCourseLearn');
    expect(lessonPage).toContain('fetchPortalLesson');
    expect(lessonPage).toContain('completePortalLesson');
    expect(lessonPage).toContain(
      'isAxiosError(reason) && reason.response?.status === 403',
    );
    expect(orderPage).toContain("apiClient.get('/api/v1/my-courses')");
    expect(orderPage).toContain(
      '<Trans message="Unable to load your courses." />',
    );
    expect(orderPage).toContain('PortalCourseGrid');
    expect(orderEntry).toContain('MyPortalLibrary');
    expect(coursePage).toContain('Continue learning');
    expect(coursePage).toContain('CourseCurriculumList');
    expect(coursePage).toContain('next_lesson_id');
    expect(coursePage).toContain('/my-portal?section=courses');
    expect(coursePage).toContain('lg:grid-cols-[minmax(0,1fr)_340px]');
    expect(coursePage).toContain('MyPortalShell');
    expect(lessonPage).toContain('CourseCurriculumList');
    expect(lessonPage).toContain('Course curriculum');
    expect(lessonPage).toContain('/my-portal?section=courses');
    expect(lessonPage).toContain('lg:grid-cols-[minmax(0,1fr)_340px]');
    expect(lessonPage).toContain('<Trans message="Overview" />');
    expect(lessonPage).toContain('<Trans message="Resources" />');
    expect(lessonPage).not.toContain('<Trans message="Notes" />');
    expect(lessonPage).not.toContain('@app/account-settings');
    expect(sidebar).toContain(
      "filter={item => item.action !== '/dashboard/my-courses'}",
    );
  });
});
