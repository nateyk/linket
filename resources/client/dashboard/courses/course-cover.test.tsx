import fs from 'node:fs'; import path from 'node:path'; import {describe,expect,test} from 'vitest';
describe('course cover aspect',()=>{
  test('uses 16/9 everywhere and shared component',()=>{
    const builder=fs.readFileSync(path.resolve('resources/client/dashboard/courses/course-builder-page.tsx'),'utf8');
    const prod=fs.readFileSync(path.resolve('resources/client/dashboard/digital-products/digital-product-form-page.tsx'),'utf8');
    expect(builder).toContain('16 / 9'); expect(builder).not.toContain('1200 / 514');
    expect(builder).toContain('ProductCover'); expect(prod).toContain('ProductCover');
  });
});
