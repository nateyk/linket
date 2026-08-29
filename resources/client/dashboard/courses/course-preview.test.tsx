import fs from 'node:fs'; import path from 'node:path'; import {describe,expect,test} from 'vitest';
describe('course preview link',()=>{
  test('uses authenticated preview endpoint',()=>{
    const src=fs.readFileSync(path.resolve('resources/client/dashboard/courses/course-builder-page.tsx'),'utf8');
    expect(src).toContain('/preview?preview=1');
    expect(src).not.toContain('`/@${course.product.title}`');
  });
});
