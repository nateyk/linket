import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const lessonPage = fs.readFileSync(
  path.resolve(
    'resources/client/dashboard/my-learning/lesson-player-page.tsx',
  ),
  'utf8',
);

describe('lesson player composition', () => {
  test('uses product title for course heading and Your progress aside', () => {
    expect(lessonPage).toMatch(/course\?\.product\?\.title|course\.product\.title/);
    expect(lessonPage).toContain('Your progress');
    expect(lessonPage).toContain('section=courses');
    expect(lessonPage).not.toContain('message="Notes"');
  });

  test('keeps shell state across lesson switches instead of nulling both', () => {
    // Full-page flash came from clearing both before every refetch.
    expect(lessonPage).not.toMatch(
      /setLesson\(null\);\s*setCourse\(null\);/,
    );
  });

  test('does not render course progress in the page header region', () => {
    // Progress belongs in the aside "Your progress" card only.
    expect(lessonPage).toContain('aria-label="Course progress"');
    const headerChunk = lessonPage.slice(
      lessonPage.indexOf('My courses'),
      lessonPage.indexOf('lg:grid-cols-[minmax(0,1fr)_340px]'),
    );
    expect(headerChunk).not.toContain('Progress.Root');
  });
});
