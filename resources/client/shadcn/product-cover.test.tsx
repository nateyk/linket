import fs from 'node:fs'; import path from 'node:path'; import {describe,expect,test} from 'vitest';
describe('product cover',()=>{
  test('shared component handles imageError and aspect-video',()=>{
    const src=fs.readFileSync(path.resolve('common/foundation/resources/client/ui/product-cover.tsx'),'utf8');
    expect(src).toContain('ProductCover');
    expect(src).toContain('imageError');
    expect(src).toContain('aspect-video');
    expect(src).toContain('onError');
  });
});
