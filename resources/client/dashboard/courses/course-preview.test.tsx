import fs from 'node:fs'; import path from 'node:path'; import {describe,expect,test} from 'vitest';
describe('course preview link',()=>{
  test('opens the human-readable course preview route',()=>{
    const src=fs.readFileSync(path.resolve('resources/client/dashboard/courses/course-builder-page.tsx'),'utf8');
    expect(src).toContain('/course/preview');
    expect(src).not.toContain('`/@${course.product.title}`');
  });
});
