import fs from 'node:fs'; import path from 'node:path'; import {describe,expect,test} from 'vitest';
describe('course move',()=>{
  test('offers move to chapter',()=>{
    const src=fs.readFileSync(path.resolve('resources/client/dashboard/courses/course-builder-page.tsx'),'utf8');
    expect(src).toContain('/move');
    expect(src).toContain('Move to');
  });
});
