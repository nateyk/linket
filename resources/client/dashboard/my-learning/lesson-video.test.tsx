import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';
import {buildPrivacyEmbedUrl} from '@app/courses/video-player/privacy-embed-url';

describe('buildPrivacyEmbedUrl', () => {
  test('rewrites youtube embed to nocookie with privacy params', () => {
    const url = buildPrivacyEmbedUrl(
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    );
    expect(url).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(url).toContain('modestbranding=1');
    expect(url).toContain('rel=0');
  });
});

describe('LessonVideo module', () => {
  const source = fs.readFileSync(
    path.resolve('resources/client/dashboard/my-learning/lesson-video.tsx'),
    'utf8',
  );

  test('uses media-chrome VideoPlayer for files and privacy iframe for hosts', () => {
    expect(source).toContain('VideoPlayerContent');
    expect(source).toContain('buildPrivacyEmbedUrl');
    expect(source).toContain('outside Linket control');
    expect(source).not.toContain('Watch on YouTube');
    expect(source).not.toContain('youtu.be/');
  });
});
