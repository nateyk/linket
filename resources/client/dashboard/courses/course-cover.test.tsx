import fs from 'node:fs'; import path from 'node:path'; import {describe,expect,test} from 'vitest';
describe('course cover aspect',()=>{
  test('uses 16/9 everywhere and shared component',()=>{
    const builder=fs.readFileSync(path.resolve('resources/client/dashboard/courses/course-builder-page.tsx'),'utf8');
    // The cover field lives in the shared settings-fields module, rendered by
    // both the builder dialog and the create page.
    const fields=fs.readFileSync(path.resolve('resources/client/dashboard/courses/course-settings-fields.tsx'),'utf8');
    const prod=fs.readFileSync(path.resolve('resources/client/dashboard/digital-products/product-preview.tsx'),'utf8');
    const card=fs.readFileSync(path.resolve('resources/client/digital-products/shared/product-card.tsx'),'utf8');
    expect(fields).toContain('16 / 9'); expect(fields).not.toContain('1200 / 514'); expect(builder).not.toContain('1200 / 514');
    expect(builder).toContain('<CourseSettingsCoverField');
    // Cover renders through the shared CroppedCover (which owns the shared
    // crop dialog + upload flow) instead of the bespoke dropzone.
    expect(fields).toContain('<CroppedCover');
    expect(fields).toContain('aspect={16 / 9}');
    // The form-page preview renders covers through the shared ProductCard,
    // which itself delegates to the shared ProductCover.
    expect(prod).toContain('shared/product-card');
    expect(card).toContain("import {ProductCover} from '@ui/product-cover'");
  });
});
