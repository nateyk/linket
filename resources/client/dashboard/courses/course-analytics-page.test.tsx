import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';
describe('course analytics page', () => {
  test('requests the analytics endpoint and renders the reference labels', () => {
    const src = fs.readFileSync('resources/client/dashboard/courses/course-analytics-page.tsx','utf8');
    expect(src).toContain("/api/v1/courses/${");
    expect(src).toContain("/analytics");
    expect(src).toContain("Active learners");
    expect(src).toContain("MetricCard");
    expect(src).toContain("Detailed performance");
    expect(src).toContain("Completion");
  });

  test('links each lesson edit action to that lesson in the builder', () => {
    const src = fs.readFileSync('resources/client/dashboard/courses/course-analytics-page.tsx', 'utf8');

    expect(src).toContain('course?lessonId=${l.id}');
  });
});

describe('analytics theme tokens', () => {
  const source = fs.readFileSync(
    path.resolve(
      'resources/client/dashboard/courses/course-analytics-page.tsx',
    ),
    'utf8',
  );

  test('uses rhythm and radius tokens, not literals', () => {
    expect(source).not.toMatch(/space-y-\d/);
    expect(source).not.toContain('rounded-xl');
    expect(source).not.toContain('bg-amber-500');
    expect(source).not.toContain('text-amber-');
    expect(source).not.toContain('dark:');
    expect(source).toContain('rounded-card');
  });

  test('warning tone resolves through the theme', () => {
    expect(source).toContain('bg-warning/10');
  });
});

describe('analytics copy is translatable', () => {
  const source = fs.readFileSync(
    path.resolve(
      'resources/client/dashboard/courses/course-analytics-page.tsx',
    ),
    'utf8',
  );

  test('hints and pills go through Trans with static messages', () => {
    expect(source).toContain('hint={<Trans message="Enrolled" />');
    expect(source).toContain('message=":count lessons"');
    expect(source).toContain('hint={<Trans message="Total" />');
    expect(source).toContain('message=":count chapters"');
    expect(source).toContain('message=":chapters chapters · :lessons lessons"');
    expect(source).not.toContain('hint="Enrolled"');
    expect(source).not.toContain('hint={`${');
  });
});

describe('analytics hierarchy', () => {
  const source = fs.readFileSync(
    'resources/client/dashboard/courses/course-analytics-page.tsx',
    'utf8',
  );

  test('the panel heading steps above body copy', () => {
    expect(source).toContain('<h2 className="text-xl font-semibold">');
  });

  test('the panel header is a flat strip, not a nested surface', () => {
    expect(source).not.toContain('border-b bg-muted/20 px-5 py-3');
  });
});
